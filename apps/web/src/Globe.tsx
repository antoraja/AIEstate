import type { CountryResult, Verdict } from '@aiestate/rules-engine';
import {
  Cartesian3,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
  Credit,
  Ellipsoid,
  EllipsoidalOccluder,
  Entity,
  GeoJsonDataSource,
  HorizontalOrigin,
  ImageryLayer,
  Ion,
  JulianDate,
  LabelStyle,
  NearFarScalar,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  StripeMaterialProperty,
  StripeOrientation,
  TileMapServiceImageryProvider,
  VerticalOrigin,
  Viewer,
  buildModuleUrl,
  createGooglePhotorealistic3DTileset,
  defined,
  type Cartesian2,
  type Cesium3DTileset,
} from 'cesium';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { CountryCollection, CountryInfo } from './countries';
import { VERDICT_STYLE } from './verdicts';

const ION_TOKEN = import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined;
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
/** Below this camera height the photorealistic city tiles replace the plain globe. */
const PHOTOREALISTIC_BELOW_M = 25_000;
const START_VIEW = Cartesian3.fromDegrees(15, 22, 22_000_000);

export interface GlobeHandle {
  flyTo(iso: string): void;
}

interface Props {
  collection: CountryCollection;
  countries: CountryInfo[];
  results: Map<string, CountryResult>;
  selected: string | null;
  onSelect(iso: string | null): void;
}

function fill(result: CountryResult | undefined, emphasised: boolean) {
  const alpha = (verdict: Verdict) => (verdict === 'UNKNOWN' ? 0.18 : 0.55) + (emphasised ? 0.25 : 0);
  const color = (v: Verdict) => Color.fromCssColorString(VERDICT_STYLE[v].color).withAlpha(alpha(v));
  if (!result) return new ColorMaterialProperty(color('UNKNOWN'));
  if (result.best === result.worst) return new ColorMaterialProperty(color(result.best));
  // Mixed countries are striped with their most lenient and strictest zone colours.
  return new StripeMaterialProperty({
    evenColor: color(result.best),
    oddColor: color(result.worst),
    orientation: StripeOrientation.VERTICAL,
    repeat: 18,
  });
}

function isoOf(picked: unknown): string | null {
  const entity = (picked as { id?: unknown } | undefined)?.id;
  if (!(entity instanceof Entity)) return null;
  return (entity.properties?.iso?.getValue() as string | undefined) ?? null;
}

export const Globe = forwardRef<GlobeHandle, Props>(function Globe(
  { collection, countries, results, selected, onSelect },
  ref,
) {
  const container = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const entitiesByIso = useRef(new Map<string, Entity[]>());
  const labelsByIso = useRef(new Map<string, Entity>());
  const updateLabelsRef = useRef<() => void>(() => {});
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [hover, setHover] = useState<{ iso: string; x: number; y: number } | null>(null);
  const [ready, setReady] = useState(false);

  useImperativeHandle(ref, () => ({
    flyTo(iso) {
      const viewer = viewerRef.current;
      const entities = entitiesByIso.current.get(iso);
      if (viewer && entities) void viewer.flyTo(entities, { duration: 1.6 });
    },
  }));

  // Create the viewer and country layer once.
  useEffect(() => {
    if (!container.current) return;
    if (ION_TOKEN) Ion.defaultAccessToken = ION_TOKEN;

    const viewer = new Viewer(container.current, {
      baseLayer: ION_TOKEN
        ? ImageryLayer.fromWorldImagery({})
        : ImageryLayer.fromProviderAsync(
            TileMapServiceImageryProvider.fromUrl(buildModuleUrl('Assets/Textures/NaturalEarthII')),
          ),
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity,
    });
    viewerRef.current = viewer;
    viewer.scene.globe.enableLighting = false;
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 200;
    viewer.camera.setView({ destination: START_VIEW });
    viewer.creditDisplay.addStaticCredit(new Credit('Boundaries: Natural Earth'));

    let disposed = false;
    void GeoJsonDataSource.load(collection, { clampToGround: false }).then((source) => {
      if (disposed) return;
      const byIso = new Map<string, Entity[]>();
      for (const entity of source.entities.values) {
        const iso = entity.properties?.iso?.getValue() as string;
        if (entity.polygon) {
          entity.polygon.height = new ConstantProperty(0);
          entity.polygon.outline = new ConstantProperty(true);
          entity.polygon.outlineColor = new ConstantProperty(Color.WHITE.withAlpha(0.35));
        }
        byIso.set(iso, [...(byIso.get(iso) ?? []), entity]);
      }
      entitiesByIso.current = byIso;
      void viewer.dataSources.add(source);
      setReady(true);
    });

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((e: { position: Cartesian2 }) => {
      onSelectRef.current(isoOf(viewer.scene.pick(e.position)));
    }, ScreenSpaceEventType.LEFT_CLICK);
    handler.setInputAction((e: { endPosition: Cartesian2 }) => {
      const iso = isoOf(viewer.scene.pick(e.endPosition));
      setHover(iso ? { iso, x: e.endPosition.x, y: e.endPosition.y } : null);
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // Photorealistic city tiles are billed per session, so they load only on the first deep zoom.
    let tileset: Cesium3DTileset | null = null;
    let loading = false;
    const removeCameraListener = GOOGLE_KEY
      ? viewer.camera.changed.addEventListener(() => {
          const close = viewer.camera.positionCartographic.height < PHOTOREALISTIC_BELOW_M;
          if (close && !tileset && !loading) {
            loading = true;
            void createGooglePhotorealistic3DTileset({ key: GOOGLE_KEY }).then((t) => {
              if (disposed) return;
              tileset = viewer.scene.primitives.add(t) as Cesium3DTileset;
              viewer.camera.changed.raiseEvent(0);
            });
          }
          if (tileset) {
            tileset.show = close;
            viewer.scene.globe.show = !close;
          }
        })
      : undefined;
    viewer.camera.percentageChanged = 0.05;

    // Hide labels on the far side of the globe; depth testing alone clips them half-way at the rim.
    const occluder = new EllipsoidalOccluder(Ellipsoid.WGS84, viewer.camera.positionWC);
    const updateLabelVisibility = () => {
      occluder.cameraPosition = viewer.camera.positionWC;
      const now = JulianDate.now();
      for (const entity of labelsByIso.current.values()) {
        const position = entity.position?.getValue(now);
        if (position && entity.label) entity.label.show = new ConstantProperty(occluder.isPointVisible(position));
      }
      viewer.scene.requestRender();
    };
    updateLabelsRef.current = updateLabelVisibility;
    const removeLabelListener = viewer.camera.changed.addEventListener(updateLabelVisibility);
    const removeMoveEndListener = viewer.camera.moveEnd.addEventListener(updateLabelVisibility);

    return () => {
      disposed = true;
      removeCameraListener?.();
      removeLabelListener();
      removeMoveEndListener();
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
      labelsByIso.current.clear();
    };
  }, [collection]);

  // Restyle countries and labels whenever the verdicts, selection or hover change.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !ready) return;
    for (const [iso, entities] of entitiesByIso.current) {
      const material = fill(results.get(iso), iso === selected || iso === hover?.iso);
      for (const e of entities) if (e.polygon) e.polygon.material = material;
    }

    // Symbol labels for the countries we cover, so verdicts never depend on colour alone.
    for (const c of countries) {
      const result = results.get(c.iso);
      const existing = labelsByIso.current.get(c.iso);
      if (!result?.covered) {
        if (existing) viewer.entities.remove(existing);
        labelsByIso.current.delete(c.iso);
        continue;
      }
      const symbols =
        result.best === result.worst
          ? VERDICT_STYLE[result.best].symbol
          : `${VERDICT_STYLE[result.best].symbol}/${VERDICT_STYLE[result.worst].symbol}`;
      const text = `${symbols}  ${c.name}`;
      if (existing?.label) {
        existing.label.text = new ConstantProperty(text);
        continue;
      }
      labelsByIso.current.set(
        c.iso,
        viewer.entities.add({
          position: Cartesian3.fromDegrees(c.anchor[0], c.anchor[1], 20_000),
          properties: { iso: c.iso },
          label: {
            text,
            font: '600 14px system-ui, sans-serif',
            fillColor: Color.WHITE,
            outlineColor: Color.fromCssColorString('#0b1220'),
            outlineWidth: 4,
            style: LabelStyle.FILL_AND_OUTLINE,
            horizontalOrigin: HorizontalOrigin.CENTER,
            verticalOrigin: VerticalOrigin.CENTER,
            scaleByDistance: new NearFarScalar(2e6, 1.1, 2.5e7, 0.7),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        }),
      );
    }
    updateLabelsRef.current();
  }, [results, selected, hover?.iso, ready, countries]);

  const hoverCountry = hover && countries.find((c) => c.iso === hover.iso);
  const hoverResult = hover && results.get(hover.iso);
  return (
    <div className="globe" ref={container} aria-label="Interactive globe. Use the search box to pick a country with the keyboard.">
      {hover && hoverCountry && defined(hoverResult) && (
        <div className="globe-tooltip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <strong>{hoverCountry.name}</strong>
          <span>
            {!hoverResult.covered && hoverResult.best === 'UNKNOWN'
              ? 'Not researched yet'
              : hoverResult.best === hoverResult.worst
                ? `${VERDICT_STYLE[hoverResult.best].symbol} ${VERDICT_STYLE[hoverResult.best].label}`
                : 'Depends on the area — click for details'}
          </span>
        </div>
      )}
    </div>
  );
});
