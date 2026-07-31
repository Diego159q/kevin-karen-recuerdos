import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Error de la app:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-boundary">
          <span className="eyebrow">Ups</span>
          <h1>Algo salio mal</h1>
          <p>Hubo un error inesperado. Recarga la pagina para continuar.</p>
          <button className="primary-button" onClick={() => window.location.reload()}>
            Recargar
          </button>
        </main>
      )
    }

    return this.props.children
  }
}
