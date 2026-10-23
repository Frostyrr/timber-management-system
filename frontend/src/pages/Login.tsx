import { Link } from 'react-router-dom'
import { useDemo } from '../demo/context'
export function Login() {
 const { mode } = useDemo()
 return <section className="panel p-8 max-w-lg mx-auto"><img src="/logo.png" alt="Timber publication" className="h-14 mb-5"/><h1 className="text-2xl mb-4">Timber inventory</h1><p>{mode === 'live' ? 'You are signed in. Access is controlled by your approved membership.' : 'Demo mode uses fictional personas. It does not authenticate with Google.'}</p><Link className="primary mt-5 inline-flex" to="/">Open inventory workspace</Link></section>
}
