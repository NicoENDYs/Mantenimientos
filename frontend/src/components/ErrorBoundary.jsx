import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import Button from './Button'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-bg px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-card">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-danger-soft text-danger-fg">
              <AlertTriangle size={24} aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-xl font-bold text-foreground">Algo salió mal</h1>
            <p className="mt-2 text-sm text-muted">
              Ocurrió un error inesperado en la aplicación. Recarga la página
              para continuar; si persiste, avisa al administrador.
            </p>
            <Button
              icon={RotateCcw}
              size="lg"
              className="mt-6"
              onClick={() => window.location.reload()}
            >
              Recargar página
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
