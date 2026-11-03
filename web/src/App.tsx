import { useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Avatar, Dialog, DialogBody, DialogContent, DialogSurface, DialogTitle, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger } from "@fluentui/react-components";
import { useEffect } from "react";
import { GoogleButton, useAuth } from "./auth";
import { Landing } from "./pages/Landing";
import { Explore } from "./pages/Explore";
import { Advisor } from "./pages/Advisor";
import { Waste } from "./pages/Waste";
import { Terms } from "./pages/Terms";
import { Transitions } from "./pages/Transitions";
import { Workspace } from "./pages/Workspace";

export function SignInDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Sign in to MA-365</DialogTitle>
          <DialogContent>
            <div className="stack">
              <p style={{ margin: 0, lineHeight: 1.5 }}>Sign in with Google to save your search history and organisation learnings, so insights are tailored to <b>your</b> situation. Not signed in? Everything still works with generic insights.</p>
              <GoogleButton onDone={onClose} />
              <p style={{ margin: 0, fontSize: 12, color: "#555" }}>Your tenant data is only ever connected to your authenticated MA-365 account.</p>
            </div>
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

function Nav({ onSignIn }: { onSignIn: () => void }) {
  const { user, signOut } = useAuth();
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : "");
  return (
    <header className="nav">
      <div className="wrap">
        <Link to="/" className="brand" aria-label="MA-365 home"><i aria-hidden><b /><b /><b /><b /></i><span>MA-365</span></Link>
        <nav aria-label="Primary">
          <NavLink to="/explore" className={cls}>Products</NavLink>
          <NavLink to="/advisor" className={cls}>Renewal advisor</NavLink>
          <NavLink to="/licenses" className={cls}>Licence waste</NavLink>
          <NavLink to="/transitions" className={cls}>Sunsets & Fabric</NavLink>
          <NavLink to="/terms" className={cls}>Contract terms</NavLink>
          {user && <NavLink to="/workspace" className={cls}>My workspace</NavLink>}
        </nav>
        {user ? (
          <Menu>
            <MenuTrigger disableButtonEnhancement><button style={{ background: "none", border: 0, cursor: "pointer", color: "inherit", display: "flex", gap: 8, alignItems: "center" }} aria-label="Account menu"><Avatar name={user.name} image={user.picture ? { src: user.picture } : undefined} size={32} /></button></MenuTrigger>
            <MenuPopover><MenuList><MenuItem disabled>{user.email}</MenuItem><MenuItem onClick={() => void signOut()}>Sign out</MenuItem></MenuList></MenuPopover>
          </Menu>
        ) : <button className="btn gold" style={{ padding: "10px 16px" }} onClick={onSignIn}>Sign in</button>}
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="brand"><i aria-hidden><b /><b /><b /><b /></i>MA-365</div>
        <p style={{ maxWidth: 900 }}>MA-365 is an independent advocacy and analytics tool for organisations that buy Microsoft products and services. It is not affiliated with, endorsed by or sponsored by Microsoft Corporation. Microsoft, Microsoft 365, Azure, Entra, Teams and related names are trademarks of Microsoft. Prices and terms shown are indicative and sourced from Microsoft-published material; always confirm against your agreement and Microsoft's current published terms. Savings figures are modeled estimates, not guarantees.</p>
        <p><Link to="/terms">Contract terms</Link> · <Link to="/explore">Products</Link> · <Link to="/advisor">Renewal advisor</Link></p>
      </div>
    </footer>
  );
}

function FloatingLogo() {
  return (
    <Link to="/" className="float-logo" aria-label="MA-365 home">
      <span className="float-bob"><i aria-hidden><b /><b /><b /><b /></i></span>
    </Link>
  );
}

function PoweredBy() {
  return (
    <a className="powered-by" href="https://illyrobotic-ai.com" target="_blank" rel="noopener noreferrer">
      Powered by <b>Illy Robotic Instruments</b>
    </a>
  );
}

export function App() {
  const [signIn, setSignIn] = useState(false);
  const loc = useLocation();
  useEffect(() => { if (!loc.hash) window.scrollTo(0, 0); }, [loc.pathname, loc.hash]);
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Nav onSignIn={() => setSignIn(true)} />
      <main id="main">
        <Routes>
          <Route path="/" element={<Landing onSignIn={() => setSignIn(true)} />} />
          <Route path="/explore" element={<Explore onSignIn={() => setSignIn(true)} />} />
          <Route path="/advisor" element={<Advisor />} />
          <Route path="/licenses" element={<Waste onSignIn={() => setSignIn(true)} />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/transitions" element={<Transitions />} />
          <Route path="/workspace" element={<Workspace onSignIn={() => setSignIn(true)} />} />
          <Route path="*" element={<div className="page"><div className="wrap"><h1>Not found</h1></div></div>} />
        </Routes>
      </main>
      <Footer />
      <FloatingLogo />
      <PoweredBy />
      <SignInDialog open={signIn} onClose={() => setSignIn(false)} />
    </>
  );
}
