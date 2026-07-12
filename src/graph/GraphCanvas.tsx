import cytoscape from 'cytoscape';
import { useEffect, useRef } from 'react';
import { appData } from '../data/appData';
import { useStore } from '../state/store';
import { registerCy, unregisterCy } from './cyInstance';
import { buildElements } from './elements';
import { buildStylesheet } from './stylesheet';
import { useGraphController } from './controllers/useGraphController';

export function GraphCanvas() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cy = cytoscape({
      container: ref.current!,
      elements: buildElements(appData()),
      style: buildStylesheet() as never,
      layout: { name: 'preset' },
      autoungrabify: true,
      autounselectify: true, // selection lives in the store, styled via .sel
      boxSelectionEnabled: false,
      minZoom: 0.03,
      maxZoom: 3,
      // renderer perf options
      hideEdgesOnViewport: true,
      textureOnViewport: false,
      motionBlur: false,
      pixelRatio: 'auto',
    } as cytoscape.CytoscapeOptions);

    // initial viewport: a readable slab of the graph's top rather than a
    // fit-all sliver (the canvas is ~2.8k x ~14.7k)
    const { bounds } = appData().layout;
    const initialZoom = 0.3;
    cy.zoom(initialZoom);
    cy.center();
    cy.pan({
      x: cy.pan().x,
      y: -bounds.minY * initialZoom + 80,
    });
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
