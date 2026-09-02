import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen grid place-items-center px-6 text-center text-mist">
          <div>
            <div className="text-2xl mb-2">Rendered lại giao diện</div>
            <button
              type="button"
              className="btn"
              onClick={() => this.setState({ error: null })}
            >
              Thử lại
            </button>
            <div className="mt-4 text-xs opacity-60 font-mono break-all">
              {(this.state.error && this.state.error.message) || "Lỗi không xác định"}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}