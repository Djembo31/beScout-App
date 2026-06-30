'use client';

import ReactDOM from 'react-dom';

/**
 * Slice 487 (W6 load-delay): emittiert ein <link rel="preload" as="image"> für das
 * LCP-Stadion-Hero in den SSR-HTML-Head — der Browser fetcht es während des HTML-Parse,
 * sodass es beim (client-gerenderten) ClubHero-Render bereits gecached ist und der LCP-Knoten
 * nicht erst nach Hydration angefragt wird.
 *
 * ReactDOM.preload = Next-kanonisches Client-Component-Pattern (context7; emittiert auch im SSR).
 * imageSrcSet/imageSizes spiegeln den next/image-srcset (q60, sizes="100vw") exakt, sodass die
 * Preload-URL die spätere <Image>-Anfrage dedupet (Cache-Hit statt Doppel-Fetch). Rendert nichts.
 */
export function PreloadStadium({ href, srcSet }: { href: string; srcSet: string }) {
  ReactDOM.preload(href, {
    as: 'image',
    imageSrcSet: srcSet,
    imageSizes: '100vw',
    fetchPriority: 'high',
  });
  return null;
}
