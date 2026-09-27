import { Link } from 'react-router-dom'
import { Button } from '../components/ui'

export function NotFoundPage() {
  return (
    <section className="container grid min-h-[60vh] place-items-center py-10">
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-green-600">404</p>
        <h1 className="mt-2 text-5xl font-black text-black">Pagina nao encontrada</h1>
        <p className="mt-3 text-gray-500">O link acessado nao existe ou foi removido.</p>
        <Link to="/" className="mt-8 inline-block">
          <Button>Voltar para home</Button>
        </Link>
      </div>
    </section>
  )
}
