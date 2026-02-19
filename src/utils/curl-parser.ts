
export interface ParsedCurl {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  bodyType: "json" | "form-data";
  // formData values can be string (simple), file object (base64 from UI), or file_path object (from cURL @)
  formData?: Record<string, string | { _type: "file"; filename: string; content: string } | { _type: "file_path"; path: string }>;
  authorization?: string;
}

export const parseCurl = (curlCommand: string): ParsedCurl | null => {
  if (!curlCommand.trim().toLowerCase().startsWith("curl")) {
    return null;
  }

  const result: ParsedCurl = {
    url: "",
    method: "GET",
    headers: {},
    body: null,
    bodyType: "json", // default
    formData: {},
    authorization: "",
  };

  // Helper to remove surrounding quotes and handle escapes
  const unquote = (str: string) => {
    // Handle ANSI-C quoting $'...'
    if (str.startsWith("$'") && str.endsWith("'")) {
        let content = str.slice(2, -1);
        content = content.replace(/\\r/g, "\r")
                         .replace(/\\n/g, "\n")
                         .replace(/\\t/g, "\t")
                         .replace(/\\'/g, "'")
                         .replace(/\\"/g, '"')
                         .replace(/\\\\/g, "\\");
        return content;
    }
    if ((str.startsWith("'") && str.endsWith("'")) || (str.startsWith('"') && str.endsWith('"'))) {
      return str.slice(1, -1);
    }
    return str;
  };

  const tokens: string[] = [];
  let currentToken = "";
  let inQuote: "'" | '"' | null = null;
  let inAnsiQuote = false;
  let escape = false;

  for (let i = 0; i < curlCommand.length; i++) {
    const char = curlCommand[i];

    if (escape) {
      currentToken += char;
      escape = false;
      continue;
    }

    if (char === "\\") {
      if (inAnsiQuote) {
          currentToken += char;
          continue;
      } else if (inQuote === '"') {
          escape = true;
          continue;
      } else if (inQuote === "'") {
          currentToken += char;
          continue;
      } else {
          escape = true;
          continue;
      }
    }

    if (inAnsiQuote) {
        if (char === "'" && curlCommand[i-1] !== '\\') { 
             inAnsiQuote = false;
             currentToken += char;
        } else {
             currentToken += char;
        }
        continue;
    }

    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
        currentToken += char;
      } else {
        currentToken += char;
      }
    } else {
      if (char === "$" && curlCommand[i+1] === "'") {
          inAnsiQuote = true;
          currentToken += char;
          currentToken += "'";
          i++; 
      } else if (char === "'" || char === '"') {
        inQuote = char;
        currentToken += char;
      } else if (/\s/.test(char)) {
        if (currentToken.length > 0) {
          tokens.push(currentToken);
          currentToken = "";
        }
      } else {
        currentToken += char;
      }
    }
  }
  if (currentToken.length > 0) {
    tokens.push(currentToken);
  }

  // Iterate tokens
  for (let i = 1; i < tokens.length; i++) { 
    const token = tokens[i];

    if (token.startsWith("http://") || token.startsWith("https://")) {
      result.url = unquote(token);
    } else if (token === "-X" || token === "--request") {
      result.method = unquote(tokens[++i] || "GET").toUpperCase();
    } else if (token === "-H" || token === "--header") {
      const header = unquote(tokens[++i] || "");
      const separatorIndex = header.indexOf(":");
      if (separatorIndex !== -1) {
        const key = header.slice(0, separatorIndex).trim();
        const value = header.slice(separatorIndex + 1).trim();
        
        if (key.toLowerCase() === 'authorization') {
            result.authorization = value;
        } else {
            result.headers[key] = value;
        }
      }
    } else if (token === "-d" || token === "--data" || token === "--data-raw" || token === "--data-binary") {
      result.body = unquote(tokens[++i] || "");
      if (result.method === "GET") result.method = "POST"; 
    } else if (token === "-b" || token === "--cookie") {
        const cookie = unquote(tokens[++i] || "");
        if (result.headers['Cookie']) {
            result.headers['Cookie'] += '; ' + cookie;
        } else {
            result.headers['Cookie'] = cookie;
        }
    } else if (token === "-F" || token === "--form") {
        result.bodyType = "form-data";
        if (result.method === "GET") result.method = "POST";
        const formField = unquote(tokens[++i] || "");
        const separatorIndex = formField.indexOf("=");
        if (separatorIndex !== -1) {
            const key = formField.slice(0, separatorIndex).trim();
            const value = formField.slice(separatorIndex + 1).trim();
            
            // Check if value is file upload @filename
            // The unquote function has already removed the outer quotes.
            // If the user provided 'file=@"/path"', tokenizer gives `file=@"/path"`.
            // unquote removes nothing if no outer matching quotes, so it remains `file=@"/path"`.
            // Then split gives value=`@"/path"`.
            // We need to check for @ and then strip potentially remaining quotes around the path if any.
            
            if (value.startsWith("@")) {
                 let path = value.slice(1);
                 // remove potential surviving quotes around the path
                 if ((path.startsWith('"') && path.endsWith('"')) || (path.startsWith("'") && path.endsWith("'"))) {
                     path = path.slice(1, -1);
                 }
                 
                 if (result.formData) {
                     result.formData[key] = {
                         _type: "file_path",
                         path: path
                     };
                 }
            } else if (value.startsWith("<")) {
                let path = value.slice(1);
                 if ((path.startsWith('"') && path.endsWith('"')) || (path.startsWith("'") && path.endsWith("'"))) {
                     path = path.slice(1, -1);
                 }
                 // < reads content and sends as value, but for our purpose maybe just treat as file path?
                 // or maybe just content string if we could read it?
                 // Let's treat as file path for now as simplifcation, user can verify
                 if (result.formData) {
                     result.formData[key] = {
                         _type: "file_path",
                         path: path
                     };
                 }
            } else {
                if (result.formData) {
                    result.formData[key] = value;
                }
            }
        }
    }
    else if (!token.startsWith("-") && !result.url) {
      result.url = unquote(token);
    }
  }

  const contentTypeKey = Object.keys(result.headers).find(k => k.toLowerCase() === 'content-type');
  let boundary = "";
  
  if (contentTypeKey) {
      const contentType = result.headers[contentTypeKey].toLowerCase();
      if (contentType.includes("multipart/form-data")) {
          result.bodyType = "form-data";
          const match = contentType.match(/boundary=([^;]+)/i);
          if (match) {
              boundary = match[1];
          }
      }
  }
  
  if (result.bodyType === "form-data" && result.body && (result.body.includes("Content-Disposition: form-data") || boundary)) {
      
      let boundaryToUse = boundary;
      if (!boundaryToUse && result.body.startsWith("--")) {
           const firstLineEnd = result.body.indexOf("\r\n");
           if (firstLineEnd !== -1) {
               boundaryToUse = result.body.slice(2, firstLineEnd); 
           }
      }

      if (boundaryToUse || result.body.includes("--")) {
          const parts = boundaryToUse 
                ? result.body.split("--" + boundaryToUse)
                : result.body.split(/--[a-zA-Z0-9-]+/); 
      
          for (const part of parts) {
            if (!part.trim() || part.trim() === "--") continue;
            
            const nameMatch = part.match(/name="([^"]+)"/);
            if (nameMatch) {
                const name = nameMatch[1];
                const filenameMatch = part.match(/filename="([^"]+)"/);

                if (filenameMatch) {
                    // It's a file!
                     if (result.formData) {
                         result.formData[name] = {
                             _type: "file",
                             filename: filenameMatch[1],
                             content: "" // placeholder
                         };
                     }
                } else {
                    const headerEndIndex = part.indexOf("\r\n\r\n");
                    if (headerEndIndex !== -1) {
                        let value = part.slice(headerEndIndex + 4);
                        if (value.endsWith("\r\n")) value = value.slice(0, -2);
                        if (result.formData) {
                            result.formData[name] = value;
                        }
                    }
                }
            }
          }
            if (Object.keys(result.formData || {}).length > 0) {
                result.body = null; 
            }
      }
  }

  return result;
};
