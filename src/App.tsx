import "./App.css";
import { useAuthStore } from "./store/auth.store";
import LoginPage from "./page/Login.page";
import RacePage from "./page/Race.page";

function App() {
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return <LoginPage />;
  }

  return <RacePage />;
}

export default App;
