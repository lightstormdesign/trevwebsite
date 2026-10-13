import { Navbar } from "@/components/site/Navbar";
import { KingdomHome } from "@/components/site/KingdomHome";

// Hard stop: Entry -> Hero is the entire homepage. No scrollable content beneath
// the hero — Music/Tour/Community/etc. live on their own pages (see App.js routes).
export default function Home() {
  return (
    <div data-testid="home-page" className="relative bg-[var(--sm-black)]">
      <Navbar />
      <KingdomHome />
    </div>
  );
}
