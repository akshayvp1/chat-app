// main.tsx
// ─── CHANGED ─────────────────────────────────────────────────────────────────
// Removed PersistGate and persistor — redux-persist is gone entirely.
// Just a plain Redux Provider now. App.tsx handles the /auth/me rehydration.
// ─────────────────────────────────────────────────────────────────────────────

import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <App />
  </Provider>
);