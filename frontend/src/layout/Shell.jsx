import Sidebar from './Sidebar.jsx';
import Footer from './Footer.jsx';

export default function Shell({ footerText, children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <div className="container">
          {children}
        </div>
        <Footer text={footerText} />
      </div>
    </div>
  );
}
