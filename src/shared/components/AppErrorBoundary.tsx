import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[LAVASH] render error", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 24,
            fontFamily: "system-ui, sans-serif",
            color: "#e6e6e6",
            background: "#1e1e1e",
            height: "100%",
            boxSizing: "border-box",
          }}
        >
          <h1 style={{ margin: "0 0 12px", fontSize: 18 }}>LAVASH — помилка інтерфейсу</h1>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontSize: 12,
              color: "#ffb800",
              background: "#121212",
              padding: 12,
              borderRadius: 8,
            }}
          >
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
