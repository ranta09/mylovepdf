import { Link } from "react-router-dom";

const Footer = () => {

  const productLinks = [
    { label: "Home", path: "/" },
    { label: "About us", path: "/about" },
    { label: "Tools", path: "/tools" },
    { label: "Blog", path: "/blog" },
  ];

  const solutionsLinks = [
    { label: "Business", path: "/business" },
    { label: "Education", path: "/education" },
  ];

  const legalLinks = [
    { label: "Security", path: "/security" },
    { label: "Terms of use", path: "/terms" },
    { label: "Privacy policy", path: "/privacy" },
  ];

  const supportLinks = [
    { label: "Help", path: "/help" },
    { label: "Contact us", path: "/contact" },
  ];

  return (
    <footer className="bg-[#1e1e1e] text-gray-300 py-16 px-6 border-t border-white/5 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="lg:col-span-1 space-y-6">
            <Link to="/" className="flex items-center group shrink-0">
              <span
                className="relative z-10 flex items-baseline gap-0"
                style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.03em" }}
              >
                <span className="text-2xl font-semibold tracking-tight text-white">Mag</span>
                <span className="relative text-2xl font-semibold tracking-tight text-white">
                  <span className="invisible">i</span>
                  <span className="absolute inset-0 flex flex-col items-center">
                    <span className="text-primary animate-bounce text-[10px] leading-none" style={{ marginTop: "-2px" }}>✦</span>
                    <span className="text-white text-2xl font-semibold leading-none" style={{ marginTop: "-4px" }}>ı</span>
                  </span>
                </span>
                <span className="text-2xl font-semibold tracking-tight text-white">c</span>
                <span className="text-2xl font-bold tracking-tight text-primary">DOCX</span>
              </span>
            </Link>
          </div>

          {/* Links Columns */}
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white mb-6">Product</h3>
            <ul className="space-y-3">
              {productLinks.map(link => (
                <li key={link.label}>
                  <Link to={link.path} className="text-sm font-medium hover:text-primary transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white mb-6">Solutions</h3>
            <ul className="space-y-3">
              {solutionsLinks.map(link => (
                <li key={link.label}>
                  <Link to={link.path} className="text-sm font-medium hover:text-primary transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white mb-6">Legal</h3>
            <ul className="space-y-3">
              {legalLinks.map(link => (
                <li key={link.label}>
                  <Link to={link.path} className="text-sm font-medium hover:text-primary transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white mb-6">Support</h3>
            <ul className="space-y-3">
              {supportLinks.map(link => (
                <li key={link.label}>
                  <Link to={link.path} className="text-sm font-medium hover:text-primary transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
