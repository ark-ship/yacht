"use client";

import { Suspense, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import {
  Environment,
  Float,
  Html,
  OrbitControls,
} from "@react-three/drei";

/* =========================================================
   TYPES
========================================================= */

type Allocation = {
  id: string;
  name: string;
  short: string;
  percent: number;
  amount: string;
  description: string;
  color: string;
};

/* =========================================================
   TOKENOMICS DATA
========================================================= */

const allocations: Allocation[] = [
  {
    id: "staking",
    name: "STAKING REWARDS",
    short: "STAKING",
    percent: 70,
    amount: "700,000,000",
    description:
      "700M $YATCH is reserved for Hood Yacht Club staking rewards and long-term holder participation.",
    color: "#c8ff00",
  },
  {
    id: "liquidity",
    name: "LIQUIDITY",
    short: "LIQUIDITY",
    percent: 10,
    amount: "100,000,000",
    description:
      "100M $YATCH is allocated for liquidity across HYC markets and the ecosystem.",
    color: "#91ad12",
  },
  {
    id: "treasury",
    name: "TREASURY / ECOSYSTEM",
    short: "TREASURY",
    percent: 10,
    amount: "100,000,000",
    description:
      "100M $YATCH is reserved for infrastructure, development and future HYC ecosystem expansion.",
    color: "#6f8410",
  },
  {
    id: "team",
    name: "TEAM",
    short: "TEAM",
    percent: 5,
    amount: "50,000,000",
    description:
      "50M $YATCH is reserved for the team with a long-term vesting structure.",
    color: "#4e5b0f",
  },
  {
    id: "marketing",
    name: "MARKETING / PARTNERSHIPS",
    short: "MARKETING",
    percent: 5,
    amount: "50,000,000",
    description:
      "50M $YATCH is reserved for partnerships, collaborations, community growth and campaigns.",
    color: "#30380b",
  },
];

/* =========================================================
   HELPERS
========================================================= */

function createSegmentGeometry(
  startAngle: number,
  endAngle: number,
  innerRadius = 1.38,
  outerRadius = 2.62,
  depth = 0.44
) {
  const shape = new THREE.Shape();

  shape.moveTo(
    Math.cos(startAngle) * outerRadius,
    Math.sin(startAngle) * outerRadius
  );

  shape.absarc(
    0,
    0,
    outerRadius,
    startAngle,
    endAngle,
    false
  );

  shape.lineTo(
    Math.cos(endAngle) * innerRadius,
    Math.sin(endAngle) * innerRadius
  );

  shape.absarc(
    0,
    0,
    innerRadius,
    endAngle,
    startAngle,
    true
  );

  shape.closePath();

  return new THREE.ExtrudeGeometry(shape, {
    depth,
    curveSegments: 32,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.025,
    bevelThickness: 0.025,
  });
}

/* =========================================================
   SEGMENT
========================================================= */

type SegmentProps = {
  allocation: Allocation;
  startAngle: number;
  endAngle: number;
  selected: boolean;
  onSelect: () => void;
};

function Segment({
  allocation,
  startAngle,
  endAngle,
  selected,
  onSelect,
}: SegmentProps) {
  const geometry = useMemo(() => {
    return createSegmentGeometry(
      startAngle,
      endAngle
    );
  }, [startAngle, endAngle]);

  return (
    <mesh
      geometry={geometry}
      scale={selected ? 1.08 : 1}
      position={[
        0,
        0,
        selected ? 0.13 : 0,
      ]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={allocation.color}
        roughness={0.35}
        metalness={0.18}
      />
    </mesh>
  );
}

/* =========================================================
   CENTER COIN
========================================================= */

function CenterCoin() {
  return (
    <group position={[0, 0, 0.52]}>
      <mesh
        rotation={[0, 0, 0]}
        castShadow
      >
        <cylinderGeometry
          args={[1.18, 1.18, 0.28, 64]}
        />

        <meshStandardMaterial
          color="#111411"
          roughness={0.28}
          metalness={0.65}
        />
      </mesh>

      <mesh
        position={[0, 0, 0.165]}
      >
        <cylinderGeometry
          args={[0.94, 0.94, 0.075, 64]}
        />

        <meshStandardMaterial
          color="#c8ff00"
          roughness={0.25}
          metalness={0.15}
        />
      </mesh>

      <Html
        center
        position={[0, 0, 0.28]}
        transform
        distanceFactor={5}
      >
        <div className="tokenomics-coin">
          <strong>1B</strong>
          <span>$YATCH</span>
        </div>
      </Html>
    </group>
  );
}

/* =========================================================
   3D SCENE
========================================================= */

function TokenScene({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const segments = useMemo(() => {
    let currentAngle = -Math.PI / 2;

    return allocations.map((allocation) => {
      const gap = 0.022;

      const startAngle =
        currentAngle + gap;

      const segmentSize =
        (allocation.percent / 100) *
        Math.PI *
        2;

      const endAngle =
        currentAngle +
        segmentSize -
        gap;

      currentAngle += segmentSize;

      return {
        ...allocation,
        startAngle,
        endAngle,
      };
    });
  }, []);

  return (
    <>
      <ambientLight intensity={0.85} />

      <directionalLight
        position={[4, 5, 6]}
        intensity={2.8}
        castShadow
      />

      <directionalLight
        position={[-4, 2, 2]}
        intensity={1}
      />

      <pointLight
        position={[0, -2, 4]}
        intensity={1}
      />

      <Float
        speed={1.05}
        rotationIntensity={0.09}
        floatIntensity={0.12}
      >
        <group>
          {segments.map((segment) => (
            <Segment
              key={segment.id}
              allocation={segment}
              startAngle={
                segment.startAngle
              }
              endAngle={
                segment.endAngle
              }
              selected={
                selectedId ===
                segment.id
              }
              onSelect={() =>
                onSelect(segment.id)
              }
            />
          ))}

          <CenterCoin />
        </group>
      </Float>

      <OrbitControls
        enablePan={false}
        enableZoom
        enableRotate
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={9}
        minPolarAngle={0.6}
        maxPolarAngle={1.55}
      />
    </>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Tokenomics() {
  const [selectedId, setSelectedId] =
    useState("staking");

  const selected =
    allocations.find(
      (allocation) =>
        allocation.id === selectedId
    ) ?? allocations[0];

  return (
    <section className="tokenomics">

      {/* ===================================================
          SECTION HEADER
      =================================================== */}

      <div className="tokenomics-head">

        <div className="tokenomics-heading">

          <span className="label">
            $YATCH / TOKENOMICS
          </span>

          <h2>
            THE
            <br />
            <span>BREAKDOWN.</span>
          </h2>

        </div>

        <div className="tokenomics-total">

          <small>
            TOTAL SUPPLY
          </small>

          <strong>
            1,000,000,000
          </strong>

          <span>
            $YATCH
          </span>

        </div>

      </div>

      {/* ===================================================
          MAIN CONTENT
      =================================================== */}

      <div className="tokenomics-layout">

        {/* 3D */}
        <div className="tokenomics-stage">

          <Canvas
            shadows
            dpr={[1, 2]}
            camera={{
              position: [
                0,
                4.7,
                7.2,
              ],
              fov: 42,
            }}
            gl={{
              antialias: true,
              alpha: false,
            }}
          >

            <color
              attach="background"
              args={["#0b0e0d"]}
            />

            <Suspense fallback={null}>

              <TokenScene
                selectedId={selectedId}
                onSelect={setSelectedId}
              />

              <Environment
                preset="city"
              />

            </Suspense>

          </Canvas>

          <div className="tokenomics-hint">
            <span>
              DRAG
            </span>
            TO ROTATE

            <b>•</b>

            <span>
              TAP
            </span>
            TO EXPLORE
          </div>

        </div>

        {/* =================================================
            INFO PANEL
        ================================================= */}

        <div className="tokenomics-info">

          <div className="tokenomics-selected">

            <span className="selected-kicker">
              SELECTED
            </span>

            <h3>
              {selected.name}
            </h3>

            <div className="selected-values">

              <strong>
                {selected.percent}%
              </strong>

              <span>
                {selected.amount} $YATCH
              </span>

            </div>

            <p>
              {selected.description}
            </p>

          </div>

          {/* ALLOCATION LIST */}

          <div className="allocation-list">

            {allocations.map(
              (allocation) => {

                const active =
                  allocation.id ===
                  selectedId;

                return (
                  <button
                    key={allocation.id}
                    type="button"
                    className={`allocation-row ${
                      active
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setSelectedId(
                        allocation.id
                      )
                    }
                  >

                    <span className="allocation-marker">
                      <i
                        style={{
                          backgroundColor:
                            allocation.color,
                        }}
                      />
                    </span>

                    <span className="allocation-name">
                      {allocation.short}
                    </span>

                    <span className="allocation-percent">
                      {allocation.percent}%
                    </span>

                    <span className="allocation-arrow">
                      ↗
                    </span>

                  </button>
                );
              }
            )}

          </div>

        </div>

      </div>

      {/* ===================================================
          BOTTOM SUMMARY
      =================================================== */}

      <div className="tokenomics-foot">

        <div className="token-foot-primary">

          <span>
            STAKING
          </span>

          <strong>
            700M
          </strong>

          <small>
            70%
          </small>

        </div>

        <div>

          <span>
            LIQUIDITY
          </span>

          <strong>
            100M
          </strong>

          <small>
            10%
          </small>

        </div>

        <div>

          <span>
            TREASURY
          </span>

          <strong>
            100M
          </strong>

          <small>
            10%
          </small>

        </div>

        <div>

          <span>
            TEAM
          </span>

          <strong>
            50M
          </strong>

          <small>
            5%
          </small>

        </div>

        <div>

          <span>
            MARKETING
          </span>

          <strong>
            50M
          </strong>

          <small>
            5%
          </small>

        </div>

      </div>

    </section>
  );
}