import { Link } from "@tanstack/react-router";
import { Hotel } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card/40 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <Hotel className="h-5 w-5 text-gold" />
              <span className="font-display text-lg font-semibold">
                Himal<span className="text-gold">Stay</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Curated stays across Nepal — from the Himalayas to the heritage cities.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Explore</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/hotels" className="hover:text-gold">Hotels</Link></li>
              <li><Link to="/about" className="hover:text-gold">About</Link></li>
              <li><Link to="/contact" className="hover:text-gold">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Account</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/auth/login" className="hover:text-gold">Sign in</Link></li>
              <li><Link to="/auth/register" className="hover:text-gold">Create account</Link></li>
              <li><Link to="/dashboard/bookings" className="hover:text-gold">My bookings</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>hello@himalstay.com</li>
              <li>+977 1-555-0024</li>
              <li>Thamel, Kathmandu, Nepal</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/40 pt-6 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} HimalStay. All rights reserved.</p>
          <p>Crafted with care.</p>
        </div>
      </div>
    </footer>
  );
}
