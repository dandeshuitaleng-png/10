// Original candidate illustration geometry. Labels, score and states are explicitly supplied by the data layer.
const MAP_LAYOUTS={
  "red": [
    {
      "entry": [
        0.64,
        0.89
      ],
      "crop": [
        0.33,
        0.64,
        0.63,
        0.33
      ],
      "focus": [
        0.72,
        0.8
      ],
      "threshold": [
        0.775,
        0.825
      ]
    },
    {
      "entry": [
        0.28,
        0.6
      ],
      "crop": [
        0,
        0.34,
        0.54,
        0.29
      ],
      "focus": [
        0.27,
        0.49
      ],
      "threshold": [
        0.27,
        0.565
      ]
    },
    {
      "entry": [
        0.65,
        0.4
      ],
      "crop": [
        0.42,
        0.2,
        0.49,
        0.24
      ],
      "focus": [
        0.7,
        0.32
      ],
      "threshold": [
        0.75,
        0.38
      ]
    },
    {
      "entry": [
        0.5,
        0.265
      ],
      "crop": [
        0,
        0,
        0.6,
        0.26
      ],
      "focus": [
        0.3,
        0.13
      ],
      "threshold": [
        0.32,
        0.205
      ],
      "side": "left"
    }
  ],
  "culture": [
    {
      "entry": [
        0.64,
        0.89
      ],
      "crop": [
        0.33,
        0.64,
        0.63,
        0.33
      ],
      "focus": [
        0.72,
        0.8
      ],
      "threshold": [
        0.75,
        0.85
      ]
    },
    {
      "entry": [
        0.28,
        0.6
      ],
      "crop": [
        0,
        0.34,
        0.54,
        0.29
      ],
      "focus": [
        0.27,
        0.49
      ],
      "threshold": [
        0.29,
        0.555
      ]
    },
    {
      "entry": [
        0.65,
        0.4
      ],
      "crop": [
        0.42,
        0.2,
        0.49,
        0.24
      ],
      "focus": [
        0.7,
        0.32
      ],
      "threshold": [
        0.73,
        0.375
      ]
    },
    {
      "entry": [
        0.5,
        0.265
      ],
      "crop": [
        0,
        0,
        0.6,
        0.26
      ],
      "focus": [
        0.3,
        0.13
      ],
      "threshold": [
        0.29,
        0.18
      ],
      "side": "left"
    }
  ],
  "industry": [
    {
      "entry": [
        0.64,
        0.89
      ],
      "crop": [
        0.33,
        0.64,
        0.63,
        0.33
      ],
      "focus": [
        0.72,
        0.8
      ],
      "threshold": [
        0.72,
        0.885
      ]
    },
    {
      "entry": [
        0.28,
        0.6
      ],
      "crop": [
        0,
        0.34,
        0.54,
        0.29
      ],
      "focus": [
        0.27,
        0.49
      ],
      "threshold": [
        0.29,
        0.57
      ]
    },
    {
      "entry": [
        0.65,
        0.4
      ],
      "crop": [
        0.42,
        0.2,
        0.49,
        0.24
      ],
      "focus": [
        0.7,
        0.32
      ],
      "threshold": [
        0.75,
        0.375
      ]
    },
    {
      "entry": [
        0.5,
        0.265
      ],
      "crop": [
        0,
        0,
        0.6,
        0.26
      ],
      "focus": [
        0.3,
        0.13
      ],
      "threshold": [
        0.29,
        0.19
      ],
      "side": "left"
    }
  ],
  "ecology": [
    {
      "entry": [
        0.64,
        0.89
      ],
      "crop": [
        0.33,
        0.64,
        0.63,
        0.33
      ],
      "focus": [
        0.7,
        0.8
      ],
      "threshold": [
        0.75,
        0.81
      ]
    },
    {
      "entry": [
        0.28,
        0.6
      ],
      "crop": [
        0,
        0.34,
        0.54,
        0.29
      ],
      "focus": [
        0.27,
        0.49
      ],
      "threshold": [
        0.27,
        0.515
      ]
    },
    {
      "entry": [
        0.65,
        0.4
      ],
      "crop": [
        0.42,
        0.2,
        0.49,
        0.24
      ],
      "focus": [
        0.7,
        0.32
      ],
      "threshold": [
        0.71,
        0.35
      ]
    },
    {
      "entry": [
        0.5,
        0.265
      ],
      "crop": [
        0,
        0,
        0.6,
        0.26
      ],
      "focus": [
        0.3,
        0.13
      ],
      "threshold": [
        0.42,
        0.18
      ],
      "side": "left"
    }
  ]
};
for (const sites of Object.values(MAP_LAYOUTS)){for (const site of sites){for(const v of Object.values(site))if(Array.isArray(v))Object.freeze(v);Object.freeze(site);}Object.freeze(sites);}Object.freeze(MAP_LAYOUTS);

function landmarkRegion(image, site, width, height) {
  if (!image || !site || !Array.isArray(site.crop) || !Array.isArray(site.focus) || site.crop.length !== 4 || site.focus.length !== 2 || ![image.width, image.height, width, height].every(value => Number.isFinite(value) && value > 0) || !site.crop.every(Number.isFinite) || !site.focus.every(Number.isFinite)) return null;
  const [x,y,w,h]=site.crop;
  if (w <= 0 || h <= 0) return null;
  const scale=Math.max(width/(w*image.width),height/(h*image.height));
  const sw=width/scale,sh=height/scale;
  const sx=Math.max(x*image.width,Math.min((x+w)*image.width-sw,site.focus[0]*image.width-sw/2));
  const sy=Math.max(y*image.height,Math.min((y+h)*image.height-sh,site.focus[1]*image.height-sh/2));
  return { sx,sy,sw,sh };
}

module.exports={ MAP_LAYOUTS, landmarkRegion };
