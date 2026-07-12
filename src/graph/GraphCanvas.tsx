import cytoscape from 'cytoscape';
import { useEffect, useRef } from 'react';
import { appData } from '../data/appData';
import { useStore } from '../state/store';
import { registerCy, unregisterCy } from './cyInstance';
import { buildElements } from './elements';
import { buildStylesheet } from './stylesheet';
import { resetView } from './viewport';
import { useGraphController } from './controllers/useGraphController';

export function GraphCanvas() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const orientation = useStore.getState().orientation;
    const cy = cytoscape({
      container: ref.current!,
      elements: buildElements(appData(), orientation),
      style: buildStylesheet() as never,
      layout: { name: 'preset' },
      autoungrabify: true,
      autounselectify: true, // selection lives in the store, styled via .sel
      boxSelectionEnabled: false,
      minZoom: 0.03,
      maxZoom: 3,
      // renderer perf options — keep edges drawn while panning so the lineage
      // links never vanish mid-gesture (worth the redraw cost at this graph size)
      hideEdgesOnViewport: false,
      textureOnViewport: false,
      motionBlur: false,
      pixelRatio: 'auto',
    } as cytoscape.CytoscapeOptions);

    // initial viewport: a readable slab at the In-Training end rather than a
    // fit-all sliver (orientation-aware — the long axis flips with it)
    resetView(cy, orientation);
    registerCy(cy);

    let lastTap = { id: '', time: 0 };
    cy.on('tap', 'node', (event) => {
      const id = event.target.id() as string;
      const now = Date.now();
      // manual double-tap detection (cy's dbltap needs selection events)
      if (lastTap.id === id && now - lastTap.time < 350) {
        useStore.getState().setFocus(id);
      } else {
        useStore.getState().select(id);
      }
      lastTap = { id, time: now };
    });
    cy.on('tap', (event) => {
      if (event.target === cy) useStore.getState().select(null);
    });

    return () => {
      unregisterCy();
      cy.destroy();
    };
  }, []);

  useGraphController();

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
}
