import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="page flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
          <h1 className="text-3xl font-black">Ups!</h1>
          <p className="text-neutral/60 max-w-md">Ocurrió un error inesperado. Recargá la página para continuar.</p>
          <button className="btn btn-accent" onClick={this.handleReload}>
            Recargar
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}