import { Link } from 'react-router-dom';
import { PageHeader } from '../components/UI';
export default function NotFound() {
  return <><PageHeader eyebrow="Error" title="Page not found" description="The page you requested does not exist." action={<Link className="button primary" to="/dashboard">Back to dashboard</Link>} /><section className="panel empty">Check the address or use the navigation above.</section></>;
}
