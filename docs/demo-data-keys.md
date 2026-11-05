# Clés de caractéristiques proposées aux contributeurs

Proposition du 26/10/2026 pour le lot 2 (`docs/demo-data.md`, §2 et §8) : les clés que le formulaire de variante propose, selon la catégorie, avant une ligne « autre » libre. Validée par Corentin le 26/10 (décisions en fin de page).

Calcul : dump de production du 22/10, 1 119 409 entrées du catalogue, 103,7 millions de lignes de propriétés, 5 207 noms de clés. Une clé est proposée pour une catégorie quand au moins la moitié de ses entrées la portent, 15 au plus, plus les clés du libellé de variante (`LABEL_PROPERTIES`) présentes dans au moins un cinquième de ses entrées. Écartées : la référence et le code-barres (`BrandPartCode`, `GTIN`), déjà champs du formulaire, et ce qui décrit l'emballage ou la logistique (`Package…`, `Pallet…`, pays d'origine, quantités par carton). Les noms restent ceux d'Icecat, en anglais : c'est sous ce nom qu'elles sont stockées, et que le libellé de variante les reconnaît.

**Format des valeurs.** Icecat stocke des nombres sans unité (largeur `326`, en mm ; poids `3100`, en g ; mémoire `0.25`, en Go) et les booléens en `Y` / `N`. Le formulaire doit donc saisir un nombre dans l'unité de la clé et proposer oui/non, sinon les valeurs saisies ne ressemblent pas aux autres et le libellé de variante (« 256 GB ») ne se calcule pas. La colonne Type est déduite des valeurs relevées ; l'unité de chaque clé numérique est établie au début du lot 2, depuis les définitions de caractéristiques d'Icecat.

## Socle, pour toutes les catégories

| Clé | Type | Exemples (Ordinateur portable) |
|---|---|---|
| Product colour | texte | `Black`, `Black,Silver` |
| Width | nombre | `326`, `329` |
| Weight | nombre | `3100`, `2900` |
| Depth | nombre | `272`, `275` |
| Height | nombre | `30.5`, `27.9` |

Présentes dans au moins la moitié des entrées de 12 des 20 catégories ci-dessous. Les moniteurs et les téléviseurs les ont « sans pied » et « avec pied » : seules les mesures sans pied sont gardées pour eux.

## Par catégorie (20 catégories d'au moins 1 000 entrées)

### Ordinateur portable — 645 778 entrées

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Internal memory | 86 % | nombre | `0.25`, `0.125` |
| Display diagonal | 86 % | nombre | `14.1`, `15` |
| Operating system installed | 85 % | texte | `Windows XP Professional`, `Windows XP Home Edition` |
| Internal memory type | 85 % | texte | `DDR-SDRAM`, `DDR2-SDRAM` |
| Total storage capacity | 84 % | nombre | `20`, `30` |
| Processor manufacturer | 84 % | texte | `AMD`, `Intel` |
| Processor family | 84 % | texte | `AMD Athlon`, `Intel Celeron` |
| Bluetooth | 84 % | oui/non | `N`, `Y` |
| Processor model | 84 % | texte | `745`, `770` |
| Display resolution | 83 % | texte | `1024 x 768`, `1400 x 1050` |
| Processor cores | 83 % | nombre | `1`, `2` |
| Native aspect ratio | 82 % | texte | `4:3`, `5:3` |
| Pointing device | 81 % | texte | `Touchpad`, `ThinkPad UltraNav` |
| On-board graphics card | 81 % | oui/non | `N`, `Y` |
| On-board graphics card model | 80 % | texte | `Not available`, `Intel GMA 950` |
| Discrete graphics card model | 77 % | texte | `AMD Mobility Radeon 7500`, `AMD Mobility Radeon` |

### Ordinateur de bureau — 312 700 entrées

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Internal memory | 79 % | nombre | `0.125`, `0.032` |
| Processor manufacturer | 79 % | texte | `Intel`, `AMD` |
| Processor family | 79 % | texte | `Intel Celeron`, `Intel Pentium 4` |
| Product type | 78 % | texte | `PC`, `Workstation` |
| Internal memory type | 78 % | texte | `DDR-SDRAM`, `DDR2-SDRAM` |
| Processor model | 78 % | texte | `2800+`, `3000+` |
| Processor cores | 78 % | nombre | `2`, `1` |
| Operating system installed | 77 % | texte | `Windows 2000 Professional`, `HP-UX Unix` |
| Ethernet LAN (RJ-45) ports | 77 % | nombre | `1`, `2` |
| Total storage capacity | 76 % | nombre | `20`, `40` |
| Chassis type | 76 % | texte | `Micro Tower`, `Midi Tower` |
| Ethernet LAN | 75 % | oui/non | `N`, `Y` |
| Optical drive type | 74 % | texte | `DVD-ROM`, `DVD±RW` |
| Maximum internal memory | 74 % | nombre | `0.5`, `1` |
| On-board graphics card | 73 % | oui/non | `Y`, `N` |
| Discrete graphics card model | 71 % | texte | `AMD Radeon FSC`, `NVIDIA GeForce2 MX` |

### Moniteur — 35 934 entrées

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Display diagonal | 96 % | nombre | `16`, `17` |
| Display resolution | 95 % | texte | `1280 x 1024`, `1600 x 1200` |
| Viewing angle, vertical | 93 % | nombre | `130`, `170` |
| Touchscreen | 93 % | oui/non | `N`, `Y` |
| Viewing angle, horizontal | 93 % | nombre | `160`, `170` |
| Response time | 93 % | nombre | `45`, `40` |
| Display brightness (typical) | 91 % | nombre | `250`, `230` |
| Contrast ratio (typical) | 88 % | texte | `400:1`, `250:1` |
| Width (without stand) | 85 % | nombre | `370`, `380` |
| Power consumption (typical) | 84 % | nombre | `45`, `90` |
| Height (without stand) | 83 % | nombre | `398`, `413` |
| Depth (without stand) | 83 % | nombre | `157`, `178` |
| Native aspect ratio | 81 % | texte | `16:9`, `4:3` |

### Smartphone / Pager — 31 394 entrées

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Bluetooth | 97 % | oui/non | `Y`, `N` |
| Display resolution | 96 % | texte | `176 x 220`, `128 x 160` |
| Form factor | 96 % | texte | `Bar`, `Flip` |
| Display diagonal | 95 % | nombre | `2.2`, `1.67` |
| Rear camera resolution (numeric) | 92 % | nombre | `0.3`, `1.3` |
| Battery capacity | 88 % | nombre | `800`, `1100` |
| Position location | 88 % | oui/non | `N`, `Y` |
| Bluetooth version | 87 % | texte | `2.0+EDR`, `1.2` |
| Mobile network generation | 87 % | texte | `3G`, `2G` |
| Panel type | 87 % | texte | `TFT`, `UFB` |
| Wi-Fi | 86 % | oui/non | `N`, `Y` |
| Rear camera type | 86 % | texte | `Single camera`, `Dual camera` |
| Platform | 84 % | texte | `Symbian`, `Windows` |
| Rear camera flash | 82 % | oui/non | `Y`, `N` |
| Internal storage capacity | 81 % | nombre | `0.128`, `2` |
| Processor family | 59 % | texte | `ARM`, `Marvell` |
| RAM capacity | 74 % | nombre | `0.0625`, `0.125` |
| Operating system installed | 69 % | texte | `Symbian OS 9.1`, `Symbian OS` |
| SIM card capability | 79 % | texte | `Single SIM`, `Dual SIM` |

### Clavier (ordinateur) — 20 109 entrées

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Connectivity technology | 96 % | texte | `Wired`, `Wireless` |
| Mouse included | 94 % | oui/non | `N`, `Y` |
| Device interface | 94 % | texte | `PS/2`, `USB` |
| Keyboard form factor | 78 % | texte | `Full-size (100%)`, `Mini` |
| Keyboard style | 72 % | texte | `Straight`, `Curved` |
| Numeric keypad | 69 % | oui/non | `Y`, `N` |
| Recommended usage | 68 % | texte | `Universal`, `Home` |
| Keyboard dimensions (WxDxH) | 67 % | texte | `383 x 256 x 42`, `464 x 168 x 36` |
| Backlight | 65 % | oui/non | `N`, `Y` |
| Keyboard language | 65 % | texte | `US English`, `Dutch` |
| Keyboard weight | 63 % | nombre | `1300`, `900` |
| Power source type | 63 % | texte | `PS/2`, `Battery` |
| Pointing device | 55 % | texte | `Integrated, high-quality 16 mm trackball`, `Touchpad: X/Y coordinate resolution: 500 dpi (20 dots/mm) (i` |
| Windows operating systems supported | 53 % | texte | `Y`, `Windows 7 Home Premium,Windows 7 Home Premium x64,Windows 7 ` |
| Wrist rest | 51 % | oui/non | `N`, `Y` |
| Keyboard layout | 47 % | texte | `QWERTY`, `AZERTY` |

### Lave-linge / Séchant combiné — 19 463 entrées

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Loading type | 97 % | texte | `Top-load`, `Front-load` |
| Appliance placement | 96 % | texte | `Freestanding (placement)`, `Built-in (placement)` |
| Rated capacity | 96 % | nombre | `4.5`, `5` |
| Maximum spin speed | 95 % | nombre | `1300`, `1200` |
| Washing programs | 94 % | texte | `Hygiene/anti-allergy,Black`, `Hygiene/anti-allergy,Black,Hand/wool,Sport,Delicate/silk` |
| Spin-drying class | 87 % | texte | `B`, `A` |
| Built-in display | 87 % | oui/non | `Y`, `N` |
| Door hinge | 82 % | texte | `left`, `right` |
| Noise level (spin) | 80 % | nombre | `74`, `76` |
| Delayed start timer | 77 % | oui/non | `Y`, `N` |
| Control type | 75 % | texte | `Buttons,Rotary`, `Rotary` |
| Door colour | 65 % | texte | `Silver`, `White` |
| Child lock | 60 % | oui/non | `Y`, `N` |
| Cycle time (max) | 58 % | nombre | `130`, `135` |
| Energy consumption washing per cycle | 57 % | nombre | `0.95`, `1.02` |

### Aspirateur — 8 021 entrées

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Cleaning type | 57 % | texte | `Dry&Wet`, `Dry` |
| Type | 57 % | texte | `Cylinder vacuum`, `` |
| Maximum input power | 56 % | nombre | `1200`, `1700` |
| Dust capacity | 52 % | nombre | `11`, `3.6` |
| Dust container type | 52 % | texte | `Combi`, `Dust bag` |
| Proper use | 51 % | texte | `Home`, `home` |

### Téléviseur à écran plat (LCD  LED  Plasma) — 6 734 entrées

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Display diagonal | 99 % | nombre | `50`, `42` |
| HD type | 98 % | texte | `HD`, `WXGA` |
| Display resolution | 98 % | texte | `1366 x 768`, `852 x 480` |
| HDMI ports quantity | 96 % | nombre | `1`, `2` |
| RMS rated power | 94 % | nombre | `10`, `2.5` |
| Width (without stand) | 92 % | nombre | `1208`, `1039` |
| Height (without stand) | 91 % | nombre | `724`, `635` |
| Depth (without stand) | 91 % | nombre | `89`, `98` |
| Display technology | 90 % | texte | `Plasma`, `LCD` |
| USB 2.0 ports quantity | 88 % | nombre | `1`, `2` |
| Wi-Fi | 87 % | oui/non | `N`, `Y` |
| Weight (without stand) | 87 % | nombre | `18000`, `12000` |

### Souris — 6 521 entrées

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Device interface | 96 % | texte | `USB Type-A`, `PS/2` |
| Buttons quantity | 89 % | nombre | `1`, `2` |
| Movement detection technology | 88 % | texte | `Opto-Mechanical`, `Optical` |
| Movement resolution | 81 % | nombre | `410`, `800` |
| Scroll type | 73 % | texte | `Wheel`, `Not available` |
| Purpose | 65 % | texte | `Office`, `office` |
| Power source | 62 % | texte | `Cable`, `Batteries` |
| Form factor | 62 % | texte | `Ambidextrous`, `Right-hand` |
| Buttons type | 54 % | texte | `Pressed buttons`, `Touch buttons` |
| Number of scroll wheels | 54 % | nombre | `1`, `2` |
| Windows operating systems supported | 53 % | texte | `Y`, `Windows 7 Home Basic,Windows 7 Home Basic x64,Windows 7 Home` |

### Cafetière filtre — 5 524 entrées

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Product type | 99 % | texte | `Espresso machine`, `Drip coffee maker` |
| Water tank capacity | 90 % | nombre | `1.8`, `1.4` |
| Coffee input type | 85 % | texte | `Coffee pod`, `Coffee capsule` |
| Power | 84 % | nombre | `1300`, `1900` |
| Built-in display | 80 % | oui/non | `N`, `Y` |
| Appliance placement | 80 % | texte | `Countertop (placement)`, `Built-in (placement)` |
| Multi beverage | 80 % | oui/non | `N`, `Y` |
| Built-in grinder | 72 % | oui/non | `N`, `Y` |
| Coffee maker type | 65 % | texte | `Semi-auto`, `Fully-auto` |
| AC input frequency | 62 % | texte | `50 - 60`, `50` |
| Control type | 61 % | texte | `Buttons`, `Buttons,Rotary` |
| Espresso making | 61 % | oui/non | `Y`, `N` |
| AC input voltage | 61 % | texte | `220 - 240`, `240` |
| Coffee making | 56 % | oui/non | `Y`, `N` |
| Capacity in cups | 54 % | nombre | `15`, `12` |

### Congélateur — 4 608 entrées

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Product type | 81 % | texte | `Chest freezer`, `Upright freezer` |
| Appliance placement | 81 % | texte | `Freestanding (placement)`, `Built-in (placement)` |
| Freezer net capacity | 77 % | nombre | `368`, `100` |
| Annual energy consumption | 76 % | nombre | `288`, `208` |
| Freezing capacity | 75 % | nombre | `22`, `18` |
| Noise level | 72 % | nombre | `40`, `38` |
| Door hinge | 70 % | texte | `Right`, `Left` |
| Storage time during power failure | 67 % | nombre | `48`, `30` |
| Climate class | 63 % | texte | `N (Normal)`, `SN (Subnormal) - T (Tropical)` |
| Freezer number of shelves/baskets | 61 % | nombre | `4`, `6` |
| Star rating | 59 % | texte | `4*`, `3*` |
| Reversible doors | 54 % | oui/non | `Y`, `N` |
| Fast freeze function | 51 % | oui/non | `Y`, `N` |
| AC input voltage | 50 % | texte | `220 - 240`, `230 - 240` |

### Imprimante — 4 276 entrées

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Print speed (black, normal quality, A4/US Letter) | 75 % | nombre | `16`, `11` |
| Colour | 74 % | oui/non | `Y`, `N` |
| Internal memory | 74 % | nombre | `96`, `64` |
| Maximum resolution | 72 % | texte | `600 x 600`, `1200 x 1200` |
| Maximum ISO A-series paper size | 71 % | texte | `A4`, `A3` |
| Total input capacity | 70 % | nombre | `600`, `250` |
| Print technology | 69 % | texte | `Laser`, `Láser` |
| Time to first page (black, normal) | 67 % | nombre | `17.5`, `13` |
| Total output capacity | 67 % | nombre | `250`, `300` |
| ISO A-series sizes (A0...A9) | 66 % | texte | `A3,A4,A5`, `A3,A4,A5,A6` |
| Maximum duty cycle | 63 % | nombre | `85000`, `65000` |
| Duplex printing | 63 % | texte | `Y`, `O` |
| Paper tray media types | 62 % | texte | `Card stock,Envelopes,Glossy paper,Labels,Plain paper,Recycle`, `Bond paper,Card stock,Envelopes,Labels,Plain paper,Postcard,` |
| Processor frequency | 61 % | nombre | `400`, `300` |
| Ethernet LAN | 56 % | oui/non | `N`, `Y` |

### Téléphone (ni mobile ni smartphone) — 3 436 entrées

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Caller ID | 90 % | oui/non | `Y`, `N` |
| Phonebook capacity | 87 % | nombre | `30`, `65` |
| Talk time | 79 % | nombre | `13`, `10` |
| Wireless connection | 78 % | oui/non | `Y`, `N` |
| Speakerphone | 78 % | oui/non | `Y`, `N` |
| Standby time | 78 % | nombre | `170`, `100` |
| Answering machine | 78 % | oui/non | `N`, `Y` |
| Built-in display | 77 % | oui/non | `Y`, `N` |
| Backlight colour | 75 % | texte | `Orange`, `Blue` |
| Multi handset capability | 74 % | nombre | `4`, `6` |
| Battery capacity | 73 % | nombre | `550`, `750` |
| Battery technology | 73 % | texte | `Nickel-Metal Hydride (NiMH)`, `Lithium-Ion (Li-Ion)` |
| Type | 72 % | texte | `DECT telephone`, `Analog telephone` |
| Call waiting | 70 % | oui/non | `Y`, `N` |
| Microphone mute | 69 % | oui/non | `Y`, `N` |
| Display diagonal | 47 % | nombre | `2.2`, `2.5` |

### Montre — 3 266 entrées

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Shape | 96 % | texte | `Square`, `Round` |
| Display type | 94 % | texte | `Digital`, `LCD` |
| Watch case colour | 94 % | texte | `Black,Grey`, `Black` |
| Touchscreen | 94 % | oui/non | `Y`, `N` |
| Display technology | 92 % | texte | `OLED`, `LCD` |
| Bluetooth version | 90 % | texte | `3.0+HS`, `1.2` |
| Display diagonal | 89 % | nombre | `1.3`, `1.6` |
| Thickness | 88 % | nombre | `8`, `9` |
| Wi-Fi | 86 % | oui/non | `N`, `Y` |
| Battery capacity | 86 % | nombre | `315`, `300` |
| Display resolution | 85 % | texte | `128 x 128`, `176 x 220` |
| Band colour | 83 % | texte | `Black`, `White` |
| Heart rate monitor | 82 % | oui/non | `Y`, `N` |
| Watch case size | 80 % | nombre | `36`, `42` |
| Bluetooth | 75 % | oui/non | `Y`, `N` |
| Processor model | 51 % | texte | `Snapdragon 400`, `TI OMAP 3` |
| RAM capacity | 70 % | nombre | `512`, `128` |
| Operating system installed | 62 % | texte | `Android`, `Tizen` |

### Réfrigérateur / Combiné réfrigérateur-congélateur — 3 042 entrées

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Appliance placement | 98 % | texte | `Freestanding (placement)`, `Built-in (placement)` |
| Annual energy consumption | 90 % | nombre | `113`, `175` |
| Door hinge | 88 % | texte | `Right`, `Left` |
| Fridge net capacity | 87 % | nombre | `154`, `152` |
| Noise level | 86 % | nombre | `40`, `38` |
| Fridge number of shelves/baskets | 84 % | nombre | `3`, `5` |
| Reversible doors | 78 % | oui/non | `Y`, `N` |
| Climate class | 75 % | texte | `N (Normal)`, `SN (Subnormal) - ST (Subtropical)` |
| Fridge interior light | 73 % | oui/non | `Y`, `N` |
| Number of vegetable drawers | 63 % | nombre | `1`, `2` |
| Egg tray | 57 % | oui/non | `Y`, `N` |
| Energy efficiency class (old) | 53 % | texte | `A`, `B` |
| Built-in display | 53 % | texte | `N`, `Y` |
| Automatic defrost (fridge) | 51 % | oui/non | `Y`, `N` |

### Fer à repasser — 2 662 entrées

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Type | 94 % | texte | `Steam iron`, `Dry iron` |
| Iron power | 92 % | nombre | `2400`, `2200` |
| Water tank capacity | 87 % | nombre | `0.220`, `0.3` |
| Continuous steam performance | 82 % | nombre | `40`, `35` |
| Steam boost performance | 81 % | nombre | `85`, `70` |
| Steam boost function | 76 % | oui/non | `Y`, `N` |
| Vertical steam function | 76 % | oui/non | `Y`, `N` |
| Spray function | 74 % | oui/non | `Y`, `N` |
| Cord length | 74 % | nombre | `1.8`, `2.5` |
| Variable steam | 71 % | oui/non | `Y`, `N` |
| Soleplate type | 68 % | texte | `Aluminium soleplate`, `Stainless Steel soleplate` |
| Anti-drip function | 67 % | oui/non | `Y`, `N` |
| Automatic anti-calc | 55 % | oui/non | `Y`, `N` |

### Friteuse — 1 472 entrées

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Construction type | 95 % | texte | `Single`, `Double` |
| Power | 87 % | nombre | `2000`, `2200` |
| Product type | 78 % | texte | `Deep fryer`, `Low fat fryer` |
| Adjustable thermostat | 76 % | oui/non | `Y`, `N` |
| Control type | 75 % | texte | `Rotary`, `Buttons` |
| Built-in display | 71 % | oui/non | `N`, `Y` |
| Appliance placement | 71 % | texte | `Stand-alone (placement)`, `Built-in (placement)` |
| Dishwasher-proof parts | 70 % | oui/non | `Y`, `N` |
| Fryer food capacity | 64 % | nombre | `1.05`, `0.8` |
| Capacity | 63 % | nombre | `1300`, `1250` |
| Removable bowl | 59 % | oui/non | `Y`, `N` |
| Frying function | 58 % | oui/non | `Y`, `N` |
| Easy to clean | 55 % | oui/non | `Y`, `N` |
| Auto power off | 52 % | oui/non | `Y`, `N` |
| Digital timer | 52 % | oui/non | `Y`, `N` |

### Grille-pain — 1 347 entrées

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Number of slices | 96 % | nombre | `2`, `1` |
| Power | 90 % | nombre | `900`, `860` |
| Removable crumb tray | 81 % | oui/non | `Y`, `N` |
| Defrost function | 76 % | oui/non | `Y`, `N` |
| Stop/cancel button | 67 % | oui/non | `Y`, `N` |
| Reheat function | 61 % | oui/non | `Y`, `N` |
| Variable crust browning control | 58 % | texte | `Y`, `N` |
| Housing material | 55 % | texte | `Plastic`, `Stainless steel` |
| Cord storage | 54 % | oui/non | `Y`, `N` |
| Number of slots | 53 % | nombre | `1`, `2` |
| AC input voltage | 50 % | texte | `220 - 240`, `220-240` |

### Lave-vaisselle — 1 321 entrées

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Appliance placement | 72 % | texte | `Freestanding (placement)`, `Countertop (placement)` |
| Noise level | 72 % | nombre | `43`, `53` |
| Door colour | 71 % | texte | `Silver`, `White` |
| Number of place settings | 70 % | nombre | `12`, `10` |
| Number of washing programs | 68 % | nombre | `5`, `4` |
| Water consumption per cycle | 66 % | nombre | `14`, `7` |
| Delayed start timer | 60 % | oui/non | `Y`, `N` |
| Energy consumption per cycle | 59 % | nombre | `1.05`, `0.63` |
| Control panel colour | 56 % | texte | `White`, `Stainless steel` |
| Dishwashing programs | 55 % | texte | `Eco,Quick`, `Eco,Intensive,Quick` |
| Built-in display | 54 % | oui/non | `Y`, `N` |
| Cycle time | 51 % | nombre | `140`, `136` |

### Aspirateur robot — 1 077 entrées

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Shape | 92 % | texte | `Round`, `Other` |
| Dust container type | 88 % | texte | `Bagless`, `Dust bag` |
| Runtime | 85 % | nombre | `60`, `90` |
| Dust capacity (total) | 77 % | nombre | `0.6`, `0.5` |
| Noise level | 77 % | nombre | `70`, `73` |
| Battery technology | 75 % | texte | `Nickel-Metal Hydride (NiMH)`, `Lithium-Ion (Li-Ion)` |
| Automatic base station return | 66 % | oui/non | `Y`, `N` |
| Charging time | 66 % | nombre | `2`, `1.5` |
| Wet mopping | 62 % | oui/non | `N`, `Y` |
| Base station | 55 % | texte | `Y`, `N` |
| Base station functions | 54 % | texte | `Charging`, `Charging,Purification` |
| Remotely operated | 51 % | oui/non | `Y`, `N` |

## Machine à pain — 134 entrées

Retenue malgré ses 134 entrées, avec la même règle : ses clés sont nettes.

| Clé | Entrées | Type | Exemples |
|---|---|---|---|
| Power | 82 % | nombre | `720`, `650` |
| Maximum bread weight | 81 % | nombre | `1000`, `900` |
| Number of auto cooking programs | 78 % | nombre | `3`, `9` |
| Viewing window | 74 % | oui/non | `Y`, `N` |
| Delayed start timer | 68 % | oui/non | `Y`, `N` |
| Built-in display | 66 % | oui/non | `Y`, `N` |
| Control type | 56 % | texte | `Sensor`, `Rotary` |
| Display type | 56 % | texte | `LCD`, `LED` |

## Catégories sans assez de données

292 catégories n'ont aucune entrée, et 32 autres en ont moins de 1 000 : elles n'ont que le socle et la ligne libre. Le **four** (448 entrées) en fait partie : ses entrées sont des accessoires (glissières, plaques), `Brand compatibility` 76 %, `Telescopic` 13 %. Hors le bain de pieds (96), les autres (tablette, console, mixeur, sèche-linge, casque…) ont 0 à 5 entrées.

## Régénérer la table du formulaire

La table que lit le formulaire, `frontend/src/data/propertyKeys.json`, vient de
`scripts/demo-data-keys/`, dans cet ordre :

1. `property_keys.py <dump> <sortie>` lit en flux un dump de production
   (`pg_restore` dans le conteneur `db`, rien n'est restauré) et compte les
   clés par catégorie ;
2. `propose_keys.py` applique les seuils et écarte le bruit ;
3. `build_property_keys.py` y ajoute, depuis `importers/icecat/data/FeaturesList.xml`,
   le type, l'unité, les libellés en 4 langues et les valeurs permises de chaque
   clé. Où Icecat a plusieurs caractéristiques du même nom, la table `CHOSEN` du
   script dit laquelle, d'après les valeurs stockées (mémoire en Go, en Mo pour
   les imprimantes, etc.).

## Décisions (Corentin, 26/10)

- **Seuils** : la moitié des entrées, 15 clés au plus par catégorie. Total : 209 clés distinctes, chacune à traduire en français, néerlandais et allemand pour le formulaire.
- **Catégories sans données** : le socle et la ligne libre, sans emprunter les clés d'une catégorie proche. Seule exception, la machine à pain avec ses propres clés.
- **Unités** : une par clé numérique, établie au début du lot 2 depuis les définitions de caractéristiques d'Icecat.
