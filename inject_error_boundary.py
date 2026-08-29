import re

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

error_boundary_code = """
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ error, info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', fontFamily: 'monospace' }}>
          <h2>Oops, something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.info && this.state.info.componentStack}
          </details>
          <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px' }}>Hard Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
"""

if "class ErrorBoundary" not in content:
    content = content.replace("function App() {\n return (", error_boundary_code + "\nfunction App() {\n return (\n <ErrorBoundary>")
    content = content.replace(" </BrowserRouter>\n );", " </BrowserRouter>\n </ErrorBoundary>\n );")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
