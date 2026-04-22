import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="empty-state empty-state--full">
      <p className="empty-state__eyebrow">404</p>
      <h1>That page drifted out of scope.</h1>
      <p>Head back to the dashboard or return to the landing page.</p>
      <div className="button-row">
        <Link className="button button--primary" to="/dashboard">
          Dashboard
        </Link>
        <Link className="button button--ghost" to="/">
          Landing page
        </Link>
      </div>
    </div>
  )
}
