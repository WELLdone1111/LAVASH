import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Коротка мітка секції (чат, редактор, артборд). */
  sectionLabel: string;
};

type State = { error: Error | null; resetKey: number };

/**
 * Ізолює падіння важких піддерев (чат, Monaco) — решта IDE лишається робочою.
 */
export default class SectionErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[LAVASH] section error (${this.props.sectionLabel})`, error, info.componentStack);
  }

  private handleReset = () => {
    this.setState((s) => ({ error: null, resetKey: s.resetKey + 1 }));
  };

  render() {
    if (this.state.error) {
      return (
        <div className="lc-section-error" role="alert">
          <p className="lc-section-error__title">
            {this.props.sectionLabel} — помилка
          </p>
          <pre className="lc-section-error__message">{this.state.error.message}</pre>
          <button type="button" className="lc-pill-button" onClick={this.handleReset}>
            Спробувати знову
          </button>
        </div>
      );
    }
    return (
      <div className="lc-section-error-boundary" key={this.state.resetKey}>
        {this.props.children}
      </div>
    );
  }
}
