import { Mart } from "@/components/mart/mart";
import { cards, formatDate, pricesCheckedOn } from "@/lib/cards";

export default function Home() {
  return (
    <main>
      <h1 className="sr-only">Toploader Mart: Pokémon card shop</h1>
      <Mart cards={cards} checkedOn={formatDate(pricesCheckedOn)} />
    </main>
  );
}
