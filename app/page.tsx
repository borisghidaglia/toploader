import { Catalog } from "@/components/catalog";
import { Hero } from "@/components/hero";
import { StageCoordinator } from "@/components/stage-coordinator";
import { cards, featured, formatDate, pricesCheckedOn } from "@/lib/cards";

export default function Home() {
  const checkedOn = formatDate(pricesCheckedOn);

  return (
    <StageCoordinator>
      <main>
        <Hero featured={featured} total={cards.length} checkedOn={checkedOn} />
        <Catalog cards={cards} />
      </main>
      <footer className="bg-case px-4 pb-10 text-[12px] leading-relaxed text-muted-ink sm:px-8">
        <div className="border-t border-rule pt-6">
          <p>
            Prices are in USD and follow the TCGplayer market price on {checkedOn}, rounded to a
            tag-friendly number. Lightly played cards are marked down 20%.
          </p>
          <p className="mt-2">
            Card images from TCGdex. Pokémon and all card art © Nintendo, Creatures and GAME FREAK.
            This shop is a fan project and isn&apos;t affiliated with them.
          </p>
        </div>
      </footer>
    </StageCoordinator>
  );
}
