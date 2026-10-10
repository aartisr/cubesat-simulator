# PCSS II CUBESAT SIMULATOR: TECHNICAL MONOGRAPH & FLIGHT SPECIFICATION
## High-Fidelity 3U/6U CubeSat Virtual Twin & Multi-Physics Orbital Mechanics Simulation System
### Document Identifier: PCSS-II-SPEC-2026-REV-4.2 | Classification: Open Aerospace Standard (AIAA/CCSDS)

> **Looking for setup, a product overview, or a guided first run?** Start with the [PCSS II CubeSat Simulator README](README.md), then return here for the detailed technical reference.

---

## EXECUTIVE SUMMARY & MISSION ARCHITECTURE

**PCSS II CubeSat Simulator** represents a state-of-the-art virtual twin and digital engineering platform for low-Earth orbit (LEO) small satellites (specifically 3U and 6U nanosatellite architectures conforming to the CubeSat Design Specification rev. 14). The platform executes high-precision, coupled multi-physics simulations in real-time (20 Hz decoupled clock with variable time-warp up to 300×), modeling:

1. **Relativistic and Perturbed Astrodynamics** (WGS-84 geodetic frame, ECI J2000 coordinates, non-spherical Earth gravity potential with $J_2$ secular nodal and apsidal precession, and high-precision Keplerian propagation).
2. **Thermospheric Fluid Aerodynamics** (Modified Harris-Priester dynamic atmospheric density model with solar $F_{10.7}$ radio flux scaling, diurnal bulge lag, attitude-dependent aerodynamic cross-sections, ballistic coefficient tracking, and orbital lifetime decay estimation).
3. **Rigid-Body Rotational Dynamics & ADCS** (Nonlinear Euler equations of motion, 4-parameter unit quaternion kinematics $\mathbb{H}_1$, three-axis reaction wheel momentum exchange, magnetic dipole desaturation, and the classic $B$-dot magnetic detumbling law coupled with an Earth tilted dipole magnetic field).
4. **Electrical Power & Solar Geometry** (True solar ephemeris vector derivation, dual-cylinder Earth conical/cylindrical shadow function with penumbral transitions, 6-face projected photodiode area calculations, Gallium Arsenide triple-junction photovoltaic temperature derating, and LiFePO$_4$ battery electrochemistry with Coulomb counting).
5. **Multi-Node Lumped-Capacitance Thermal Network** (Nodal heat capacity matrix, Stefan-Boltzmann radiative exchange to deep space at $2.73\,\text{K}$, direct solar irradiance, planetary infrared albedo, inter-node conductive couplings, variable-aperture radiator louvers, bimetallic survival patch heaters, and pyrolytic graphite thermal straps).
6. **Atmospheric GNSS Radio Occultation (GNSS-RO)** (Carrier phase Doppler shift modeling, geometric ray tracing, bending angle retrieval via the inverse Abel integral transform, Smith-Weintraub atmospheric refractivity equation, and vertical profile inversion of temperature, atmospheric pressure, and water vapor partial pressure, coupled with on-board edge-AI sounding classification).
7. **Conjunction Assessment & Orbital Safety (CAM)** (2D $B$-plane collision coordinate frame, primary and secondary state covariance projection, Foster-Chan 2D Gaussian probability density integration over the hard-body circumscribing sphere, time-to-closest-approach (TCA) prediction, and autonomous impulse burn calculation).
8. **RF Communications & Ground Station Telemetry** (Friis transmission link budget, free-space path loss (FSPL), atmospheric and polarization losses, carrier-to-noise density ratio $C/N_0$, bit error rate (BER) curves, relativistic Doppler frequency shifts, and an interconnected global tracking network spanning high-latitude and equatorial ground stations).

---

## 1. ASTRODYNAMICS & ORBITAL MECHANICS

### 1.1 Coordinate Systems & Frame Transformations
PCSS II CubeSat Simulator rigorously models motion in three fundamental reference frames:
- **Earth-Centered Inertial (ECI J2000)**: Origin at Earth's center of mass, $X$-axis pointing toward the vernal equinox at J2000.0, $Z$-axis parallel to Earth's rotational axis, and $Y$-axis completing the right-handed Cartesian orthogonal basis ($\hat{X} \times \hat{Y} = \hat{Z}$).
- **Earth-Centered, Earth-Fixed (ECEF)**: Rotating frame co-moving with Earth's diurnal rotation at angular velocity $\omega_\oplus = 7.292115 \times 10^{-5}\,\text{rad/s}$. Transformation from ECI to ECEF is governed by the Greenwich Mean Sidereal Time (GMST) rotation matrix $\mathbf{R}_z(\theta_{\text{GMST}})$.
- **Geodetic Coordinates (WGS-84)**: Defined by semi-major axis $a_E = 6378.137\,\text{km}$ and flattening $f = 1/298.257223563$. Altitude $h$, geodetic latitude $\phi$, and longitude $\lambda$ are retrieved via iterative Bowring algorithms.

### 1.2 Two-Body Problem & Keplerian Elements
In the unperturbed two-body framework governed by Newton's law of universal gravitation:
$$\ddot{\mathbf{r}} = -\frac{\mu}{r^3} \mathbf{r}$$
where $\mu = G M_\oplus = 3.986004418 \times 10^{14}\,\text{m}^3/\text{s}^2$. The state is uniquely defined by the classical Keplerian orbital elements:
$$\mathbf{E} = \{a, e, i, \Omega, \omega, \nu\}$$
- $a$: Semi-major axis ($\text{km}$)
- $e$: Orbital eccentricity ($0 \le e < 1$ for closed elliptical orbits)
- $i$: Orbital inclination with respect to the equatorial plane ($\text{rad}$ or $\text{deg}$)
- $\Omega$: Right Ascension of the Ascending Node (RAAN)
- $\omega$: Argument of perigee
- $\nu$: True anomaly (or mean anomaly $M$)

Mean motion $\bar{n}$ and orbital period $T$ satisfy Kepler's third law:
$$\bar{n} = \sqrt{\frac{\mu}{a^3}}, \quad T = 2\pi \sqrt{\frac{a^3}{\mu}}$$

Conversion between mean anomaly $M$ and eccentric anomaly $E$ is executed via **Kepler's Transcendental Equation**:
$$M = E - e \sin E$$
solved iteratively to double-precision tolerance ($\epsilon < 10^{-12}$) using the **Newton-Raphson method**:
$$E_{n+1} = E_n - \frac{E_n - e \sin E_n - M}{1 - e \cos E_n}$$
True anomaly $\nu$ is subsequently recovered via the half-angle relation:
$$\tan\left(\frac{\nu}{2}\right) = \sqrt{\frac{1+e}{1-e}} \tan\left(\frac{E}{2}\right)$$

### 1.3 Earth Oblateness ($J_2$) Gravitational Perturbation
Due to Earth's centrifugal equatorial bulge, the gravitational potential expanded in spherical harmonics retains a dominant second zonal harmonic $J_2 = 1.08263 \times 10^{-3}$:
$$V(r, \phi) = -\frac{\mu}{r} \left[ 1 - J_2 \left(\frac{R_E}{r}\right)^2 \left(\frac{3\sin^2\phi - 1}{2}\right) \right]$$

Applying Lagrange's planetary equations yields the secular (long-term average) drift rates:
1. **Nodal Precession Rate ($\dot{\Omega}$)**:
   $$\dot{\Omega} = -\frac{3}{2} J_2 \left(\frac{R_E}{p}\right)^2 \bar{n} \cos i$$
   where $p = a(1 - e^2)$ is the semi-latus rectum.
2. **Apsidal Rotation Rate ($\dot{\omega}$)**:
   $$\dot{\omega} = \frac{3}{4} J_2 \left(\frac{R_E}{p}\right)^2 \bar{n} (5 \cos^2 i - 1)$$

#### Sun-Synchronous Orbit (SSO) Condition
To maintain a constant angle between the orbital plane and the Sun vector throughout Earth's heliocentric year, the orbital plane must precess eastward at Earth's mean orbital angular velocity:
$$\dot{\Omega}_{\text{SSO}} = \frac{360^\circ}{365.2422\,\text{days}} \approx 1.99106 \times 10^{-7}\,\text{rad/s} \approx 0.9856^\circ/\text{day}$$
Equating this to the $J_2$ drift formula specifies the exact inclination required for any given altitude $h$:
$$\cos i_{\text{SSO}} = -\frac{2}{3} \frac{\dot{\Omega}_{\text{SSO}}}{J_2 \bar{n}} \left(\frac{a(1-e^2)}{R_E}\right)^2$$
For PCSS-II at $h = 520\,\text{km}$ ($a = 6898.14\,\text{km}$), this yields the retrograde inclination $i \approx 97.45^\circ$.

---

## 2. THERMOSPHERIC AERODYNAMICS & ORBIT DECAY

### 2.1 The Modified Harris-Priester Atmosphere Model
In low-Earth orbit ($200\,\text{km} \le h \le 1000\,\text{km}$), residual atmospheric gas exerts continuous aerodynamic drag. The local neutral density $\rho(h, \psi)$ is determined via the semi-empirical **Harris-Priester model**, accounting for diurnal atmospheric expansion driven by extreme ultraviolet (EUV) solar radiation:
$$\rho(h, \psi) = \rho_{\min}(h) + \left[ \rho_{\max}(h) - \rho_{\min}(h) \right] \cos^n\left(\frac{\psi}{2}\right)$$
where:
- $\rho_{\min}(h)$ and $\rho_{\max}(h)$ are altitude-dependent density profiles tabulated from the Jacchia/CIRA atmospheric reference data, scaled dynamically by the solar activity radio flux index $F_{10.7}$ ($\text{sfu}$, nominal $120.0\,\text{sfu}$).
- $\psi$ is the angle between the satellite geocentric position vector $\hat{\mathbf{r}}$ and the apex of the diurnal atmospheric bulge:
  $$\cos \psi = \hat{\mathbf{r}} \cdot \hat{\mathbf{u}}_{\text{bulge}}$$
- The diurnal bulge apex $\hat{\mathbf{u}}_{\text{bulge}}$ lags the sub-solar point by approximately $30^\circ$ East in right ascension due to atmospheric thermal inertia.
- The exponent $n$ characterizes latitude variation ($n = 2$ for low inclination, $n = 6$ for polar orbits).

### 2.2 Relative Velocity & Continuous Drag Deceleration
Because the thermosphere co-rotates with the solid Earth, the satellite's velocity relative to the atmosphere is:
$$\mathbf{v}_{\text{rel}} = \mathbf{v} - \boldsymbol{\omega}_\oplus \times \mathbf{r}$$
The resulting aerodynamic drag deceleration vector is:
$$\mathbf{a}_{\text{drag}} = -\frac{1}{2} \rho(h, \psi) \left(\frac{C_d A_{\text{eff}}}{m}\right) \|\mathbf{v}_{\text{rel}}\| \mathbf{v}_{\text{rel}}$$
where:
- $C_d$: Drag coefficient ($C_d \approx 2.2$ for diffuse molecular reflection on CubeSat surfaces in free-molecular flow regimes where Knudsen number $\text{Kn} \gg 10$).
- $m$: Spacecraft wet mass ($\text{kg}$).
- $A_{\text{eff}}$: Projected cross-sectional area perpendicular to $\mathbf{v}_{\text{rel}}$, modulated by satellite attitude:
  $$A_{\text{eff}}(\mathbf{q}) = \sum_{k=1}^6 A_k \max\left(0, (\mathbf{R}(\mathbf{q}) \hat{\mathbf{n}}_k) \cdot \frac{\mathbf{v}_{\text{rel}}}{\|\mathbf{v}_{\text{rel}}\|}\right)$$
  For a 3U CubeSat:
  - Minimum Drag Configuration (Ram-facing $1\text{U} \times 1\text{U}$): $A_{\text{min}} = 0.010\,\text{m}^2$
  - Maximum Drag Configuration (Broadside $3\text{U} \times 1\text{U}$): $A_{\text{max}} = 0.030\,\text{m}^2$
- Ballistic coefficient $B = \frac{m}{C_d A_{\text{eff}}}$.

### 2.3 Orbital Semi-Major Axis Decay Rate
Over an orbital period, the energy dissipation rate yields the secular rate of change of semi-major axis:
$$\frac{da}{dt} \approx -2\pi \left(\frac{C_d A_{\text{eff}}}{m}\right) \rho(a) a^2$$
Expressed in meters per solar day:
$$\Delta a_{\text{day}} = 86400 \times \frac{da}{dt}$$

---

## 3. ATTITUDE DETERMINATION & CONTROL SYSTEM (ADCS)

### 3.1 Unit Quaternion Kinematics ($\mathbb{H}_1$)
To guarantee singularity-free orientation tracking without gimbal lock, PCSS II CubeSat Simulator represents spacecraft attitude in the unit quaternion space:
$$\mathbf{q} = \begin{bmatrix} q_0 \\ q_1 \\ q_2 \\ q_3 \end{bmatrix} = \begin{bmatrix} \cos(\theta/2) \\ \hat{\mathbf{e}} \sin(\theta/2) \end{bmatrix}, \quad \|\mathbf{q}\|^2 = q_0^2 + q_1^2 + q_2^2 + q_3^2 = 1$$
The kinematic time derivative coupled with the body angular velocity vector $\boldsymbol{\omega} = [\omega_x, \omega_y, \omega_z]^T$ is:
$$\dot{\mathbf{q}} = \frac{1}{2} \boldsymbol{\Omega}(\boldsymbol{\omega}) \mathbf{q} = \frac{1}{2} \begin{bmatrix} 0 & -\omega_x & -\omega_y & -\omega_z \\ \omega_x & 0 & \omega_z & -\omega_y \\ \omega_y & -\omega_z & 0 & \omega_x \\ \omega_z & \omega_y & -\omega_x & 0 \end{bmatrix} \begin{bmatrix} q_0 \\ q_1 \\ q_2 \\ q_3 \end{bmatrix}$$
Numerical integration employs a normalized Runge-Kutta step with renormalization:
$$\mathbf{q}_{k+1} = \frac{\mathbf{q}_k + \Delta t \dot{\mathbf{q}}_k}{\|\mathbf{q}_k + \Delta t \dot{\mathbf{q}}_k\|}$$

The corresponding direction cosine transformation matrix from inertial to body frame $\mathbf{R}_{\text{ECI}\to\text{Body}}(\mathbf{q})$ is:
$$\mathbf{R}(\mathbf{q}) = \begin{bmatrix}
1 - 2(q_2^2 + q_3^2) & 2(q_1 q_2 + q_0 q_3) & 2(q_1 q_3 - q_0 q_2) \\
2(q_1 q_2 - q_0 q_3) & 1 - 2(q_1^2 + q_3^2) & 2(q_2 q_3 + q_0 q_1) \\
2(q_1 q_3 + q_0 q_2) & 2(q_2 q_3 - q_0 q_1) & 1 - 2(q_1^2 + q_2^2)
\end{bmatrix}$$

### 3.2 Rigid-Body Rotational Dynamics
Governed by Euler's rotational equations of motion with internal reaction wheel momentum $\mathbf{h}_w = \mathbf{I}_w \boldsymbol{\Omega}_w$:
$$\mathbf{I} \dot{\boldsymbol{\omega}} + \boldsymbol{\omega} \times (\mathbf{I} \boldsymbol{\omega} + \mathbf{h}_w) = \boldsymbol{\tau}_{\text{ctrl}} + \boldsymbol{\tau}_{\text{ext}} - \dot{\mathbf{h}}_w$$
where:
- $\mathbf{I} = \text{diag}(I_{xx}, I_{yy}, I_{zz})$ is the spacecraft principal inertia tensor ($\text{kg}\cdot\text{m}^2$).
- $\dot{\mathbf{h}}_w = \boldsymbol{\tau}_w$ is the reaction wheel torque vector applied to the body.
- $\boldsymbol{\tau}_{\text{ext}} = \boldsymbol{\tau}_{\text{grav}} + \boldsymbol{\tau}_{\text{aero}} + \boldsymbol{\tau}_{\text{mag}}$ represents environmental disturbance torques.

### 3.3 Magnetic Detumbling & The $B$-Dot Law
Upon orbital deployment or post-conjunction safe mode entry, tumbling rates may exceed $30^\circ/\text{s}$. Detumbling is achieved without mechanical wear via three-axis magnetic torque rods (magnetorquers) executing the classic **$B$-dot control law**:
$$\mathbf{m}_{\text{dipole}} = -\frac{k_{\text{bdot}}}{\|\mathbf{B}\|} \dot{\mathbf{B}}$$
where $\mathbf{B}$ is the local geomagnetic field vector measured by the on-board three-axis magnetometer (modeled via the tilted geomagnetic dipole model), $\dot{\mathbf{B}}$ is its rate of change in the body frame, and $k_{\text{bdot}}$ is the control gain. The resulting mechanical torque on the spacecraft:
$$\boldsymbol{\tau}_{\text{mag}} = \mathbf{m}_{\text{dipole}} \times \mathbf{B}$$
always opposes spacecraft angular velocity perpendicular to the magnetic field line ($\boldsymbol{\omega} \cdot \boldsymbol{\tau}_{\text{mag}} \le 0$), asymptotically dissipating rotational kinetic energy $T_{\text{rot}} = \frac{1}{2}\boldsymbol{\omega}^T \mathbf{I} \boldsymbol{\omega}$ to quiescent rates ($< 0.1^\circ/\text{s}$).

### 3.4 Pointing Modes & Quaternion Feedback Control
When detumbled, reaction wheels operate under quaternion-error proportional-integral-derivative (PID) control:
$$\mathbf{q}_e = \mathbf{q}_{\text{target}}^{-1} \otimes \mathbf{q}_{\text{current}}$$
$$\boldsymbol{\tau}_w = -K_p \text{sgn}(q_{e,0}) \mathbf{q}_{e,1:3} - K_d (\boldsymbol{\omega} - \boldsymbol{\omega}_{\text{target}}) - K_i \int \mathbf{q}_{e,1:3} dt$$

Operational pointing orientations include:
- **Nadir-Pointing**: $+Z_{\text{body}}$ aligned along $-\hat{\mathbf{r}}$ for Earth observation and GNSS-RO zenith/limb pointing.
- **Sun-Pointing**: Maximum solar flux absorption with $+Y_{\text{body}}$ (solar array face) aligned along $\hat{\mathbf{s}}$.
- **Ground Station Tracking**: Dynamic slew targeting designated Earth ground stations during horizon-to-horizon overflights.
- **Inertial Hold**: Constant orientation in ECI coordinates.

---

## 4. ELECTRICAL POWER SYSTEM (EPS) & SOLAR GEOMETRY

### 4.1 Solar Position & Eclipse Transition Model
The geocentric solar vector $\mathbf{r}_\odot$ is computed from the Julian Date (JD) via the IAU low-precision solar ephemeris:
$$\lambda_\odot = 280.460^\circ + 0.9856474^\circ \times (JD - 2451545.0)$$
$$g_\odot = 357.528^\circ + 0.9856003^\circ \times (JD - 2451545.0)$$
$$\mathbf{s}_{\text{ECI}} = \begin{bmatrix} \cos \lambda_\odot \\ \sin \lambda_\odot \cos \epsilon_0 \\ \sin \lambda_\odot \sin \epsilon_0 \end{bmatrix}$$
where $\epsilon_0 = 23.439^\circ$ is the obliquity of the ecliptic.

The eclipse state accounts for the finite angular radius of the Sun ($\theta_\odot \approx 0.267^\circ$) and Earth ($\theta_\oplus = \arcsin(R_E / r)$):
- **Umbra**: Complete solar disk occultation; illumination factor $\nu = 0.0$.
- **Penumbra**: Partial solar disk occultation; illumination factor smoothly transitions:
  $$\nu = \frac{\theta_\odot + \theta_\oplus - \theta_{\text{sep}}}{2 \theta_\odot} \in (0, 1)$$
- **Sunlight**: Full illumination; $\nu = 1.0$.

### 4.2 Multi-Face Photovoltaic Generation & Temperature Derating
For each of the six orthogonal faces of the CubeSat bus ($+X, -X, +Y, -Y, +Z, -Z$), the normal vector in the body frame is $\hat{\mathbf{n}}_k$. The effective projected solar irradiance is:
$$I_k = S_0 \cdot \nu \cdot \max(0, (\mathbf{R}(\mathbf{q})^T \hat{\mathbf{n}}_k) \cdot \hat{\mathbf{s}}_{\text{ECI}})$$
where $S_0 = 1361.0\,\text{W/m}^2$ is the solar constant at 1 AU.

Photovoltaic conversion employs triple-junction Gallium Arsenide (InGaP/InGaAs/Ge) cells with baseline efficiency $\eta_0 = 30.0\%$ at reference temperature $T_0 = 25^\circ\text{C}$ ($298.15\,\text{K}$). The thermal derating follows the negative temperature coefficient $\beta = 0.0022\,\text{K}^{-1}$:
$$\eta(T_{\text{panel}}) = \eta_0 \left[ 1 - \beta (T_{\text{panel}} - 25.0) \right]$$
Total generated power is the superposition over all active solar array surfaces:
$$P_{\text{solar}} = \sum_{k=1}^6 A_k \eta(T_{\text{panel}}) I_k$$

### 4.3 Battery Kinetics & State-of-Charge (SOC)
The energy storage subsystem models an 8S lithium-iron-phosphate (LiFePO$_4$) / lithium-ion battery pack with nominal capacity $C_{\text{nom}} = 40.0\,\text{Wh}$ (expandable to $95.0\,\text{Wh}$ on 6U buses). The net battery power flow is:
$$P_{\text{batt}} = P_{\text{solar}} - P_{\text{load}} - P_{\text{heaters}}$$
When $P_{\text{batt}} > 0$, the battery charges with Coulomb efficiency $\eta_{\text{chg}} = 96\%$; when $P_{\text{batt}} < 0$, it discharges into regulated $3.3\,\text{V}$, $5.0\,\text{V}$, and $12.0\,\text{V}$ power distribution rails:
$$\frac{d(\text{SOC})}{dt} = \begin{cases}
\frac{P_{\text{batt}} \eta_{\text{chg}}}{C_{\text{nom}}}, & P_{\text{batt}} \ge 0 \\
\frac{P_{\text{batt}}}{C_{\text{nom}}}, & P_{\text{batt}} < 0
\end{cases}$$
Battery open-circuit voltage $V_{\text{oc}}$ is modeled as a nonlinear function of SOC:
$$V_{\text{oc}}(\text{SOC}) = V_{\min} + (V_{\max} - V_{\min})\text{SOC}^{0.5} - R_{\text{int}} I_{\text{batt}}$$

---

## 5. MULTI-NODE THERMAL CONTROL SYSTEM (TCS)

### 5.1 Lumped-Capacitance Thermodynamic Network
Spacecraft components exhibit distinct thermal time constants, conductive paths, and internal heat dissipations. PCSS II CubeSat Simulator resolves internal temperatures via a **multi-node lumped capacitance network** comprising eight critical nodes:
1. `BATTERY`: Electrochemical energy storage pack ($m c_p = 180\,\text{J/K}$, safe range $0^\circ\text{C}$ to $45^\circ\text{C}$).
2. `OBC_CORE`: On-Board Computer & Edge-AI accelerator ($m c_p = 65\,\text{J/K}$, max $75^\circ\text{C}$).
3. `PAYLOAD_GNSS`: High-gain GNSS-RO RF front-end receiver ($m c_p = 90\,\text{J/K}$).
4. `RF_PA`: S-Band / X-Band RF Power Amplifier ($m c_p = 45\,\text{J/K}$, high concentrated heat flux).
5. `ADCS_WHEELS`: 3-axis reaction wheel cluster ($m c_p = 110\,\text{J/K}$).
6. `CHASSIS`: Aluminum 6061-T6 structural bus frame ($m c_p = 420\,\text{J/K}$).
7. `RADIATOR`: High-emissivity optical solar reflector plate ($m c_p = 85\,\text{J/K}$).
8. `SOLAR_PANELS`: External photovoltaic substrate with polyimide MLI backing ($m c_p = 140\,\text{J/K}$).

For each node $i$, the temperature rate of change obeys the thermal conservation equation:
$$C_i \frac{dT_i}{dt} = Q_{\text{ext},i} + Q_{\text{int},i} - Q_{\text{rad},i} + \sum_{j \ne i} K_{ij} (T_j - T_i)$$
where:
- $C_i$: Thermal capacitance ($m_i c_{p,i}$) in $\text{J/K}$.
- $K_{ij}$: Conductive thermal conductance matrix ($\text{W/K}$) connecting node $i$ and node $j$.
- $Q_{\text{ext},i}$: External environmental heat flux (direct solar, Earth albedo, planetary IR).
- $Q_{\text{int},i}$: Internal electrical dissipation (Joule heating).
- $Q_{\text{rad},i}$: Radiative dissipation into deep space.

### 5.2 External Environmental Heat Sources
1. **Direct Solar Flux ($Q_{\text{solar}}$)**:
   $$Q_{\text{solar}} = \alpha_s \cdot S_0 \cdot \nu \cdot A_{\text{proj}}$$
   where $\alpha_s$ is the solar absorptivity of the surface coating (e.g., $\alpha_s \approx 0.88$ for solar cells, $0.15$ for white thermal paint).
2. **Earth Albedo Flux ($Q_{\text{albedo}}$)**:
   Reflected solar radiation from Earth's atmosphere and clouds, with mean planetary albedo $a \approx 0.30$:
   $$Q_{\text{albedo}} = a \cdot S_0 \cdot F_{\text{sat}\to\text{Earth}} \cdot \cos \theta_{\text{sub-solar}} \cdot \alpha_s A$$
   where $F_{\text{sat}\to\text{Earth}}$ is the geometric view factor:
   $$F_{\text{sat}\to\text{Earth}} = \left(\frac{R_E}{R_E + h}\right)^2$$
3. **Planetary Infrared Radiation ($Q_{\text{Earth-IR}}$)**:
   Longwave thermal emission from Earth (approximated as a blackbody at $T_\oplus \approx 255\,\text{K}$ emitting $q_{\text{IR}} \approx 237\,\text{W/m}^2$):
   $$Q_{\text{Earth-IR}} = \epsilon \cdot q_{\text{IR}} \cdot F_{\text{sat}\to\text{Earth}} \cdot A$$

### 5.3 Radiative Heat Rejection to Deep Space
Radiation to the cosmic microwave background ($T_{\text{space}} = 2.73\,\text{K} \approx 3\,\text{K}$) obeys the **Stefan-Boltzmann Law**:
$$Q_{\text{rad}} = \epsilon_{\text{eff}} \sigma A \left( T_i^4 - T_{\text{space}}^4 \right)$$
where $\sigma = 5.670374 \times 10^{-8}\,\text{W}/(\text{m}^2\cdot\text{K}^4)$ and $\epsilon_{\text{eff}}$ is the effective hemispherical infrared emissivity.

### 5.4 Active Heat Dissipation & Thermal Controls
To prevent component overheating or battery freezing in cryogenic eclipse (-45°C), the system incorporates four active mechanisms:
1. **Variable Radiator Louvers**: Mechanical bimetallic louvers mounted over the high-emissivity radiator plate. Modulating aperture angle $\theta \in [0, 1]$ varies effective radiator emissivity:
   $$\epsilon_{\text{eff}}(\theta) = \epsilon_{\text{closed}} + \theta (\epsilon_{\text{open}} - \epsilon_{\text{closed}})$$
   where $\epsilon_{\text{closed}} = 0.12$ and $\epsilon_{\text{open}} = 0.85$. An autonomous thermostat adjusts $\theta$ via proportional feedback toward a setpoint (default $21.0^\circ\text{C}$).
2. **Survival Patch Heaters**: Resistance Kapton heaters mounted on the battery cells ($4.5\,\text{W}$) and GNSS-RO payload ($3.0\,\text{W}$) with deadband hysteresis:
   - Activates when $T_{\text{node}} \le 2.0^\circ\text{C}$
   - Deactivates when $T_{\text{node}} \ge 8.0^\circ\text{C}$
   Heater power is coupled directly to the EPS load bus.
3. **Pyrolytic Graphite Heat Straps**: High thermal conductivity links ($k > 1500\,\text{W}/(\text{m}\cdot\text{K})$) between high-power electronics (`RF_PA`, `OBC_CORE`) and the outer radiator plate. Conductance modes include `ISOLATED` ($0.1\,\text{W/K}$), `NOMINAL` ($0.8\,\text{W/K}$), and `HIGH_CONDUCTION` ($2.4\,\text{W/K}$).
4. **Thermal Derating of Active Payloads**: Autonomous frequency throttling reduces OBC and Edge-AI clock speed by $45\%$ when core temperature exceeds $65^\circ\text{C}$, dropping internal heat dissipation from $8.5\,\text{W}$ to $3.2\,\text{W}$.

---

## 6. GNSS RADIO OCCULTATION (GNSS-RO) & CLIMATE SOUNDING

### 6.1 Principle of Atmospheric Radio Occultation
GNSS Radio Occultation leverages multi-frequency signals (GPS L1: $1575.42\,\text{MHz}$, L2: $1227.60\,\text{MHz}$; Galileo E1/E5a) transmitted by high-altitude GNSS constellations ($h \approx 20,200\,\text{km}$) that traverse Earth's limb as the LEO CubeSat sets or rises across the horizon. As the signal propagates through the refractive neutral atmosphere and ionosphere, it experiences phase delay, frequency Doppler shift, and ray bending.

### 6.2 The Inverse Abel Integral Transform
From measured carrier Doppler shifts $\Delta f_D(t)$ and known transmitter/receiver orbital vectors, the signal excess phase is differentiated to compute the ray bending angle $\alpha$ as a function of impact parameter $a = r \cdot n(r) \cdot \sin \phi$:
$$\alpha(a) = -c \frac{\Delta f_D}{f_0 v_{\text{rel}}}$$
Under the assumption of spherical symmetry in the local atmospheric column, the vertical profile of the index of refraction $n(r)$ is recovered analytically via the **Inverse Abel Transform**:
$$n(r_0) = \exp\left( \frac{1}{\pi} \int_{a_0}^\infty \frac{\alpha(a)}{\sqrt{a^2 - a_0^2}} \, da \right)$$
where $a_0 = r_0 n(r_0)$ is the impact parameter corresponding to ray perigee radius $r_0$.

### 6.3 Smith-Weintraub Equation & Meteorological Retrieval
Atmospheric refractivity $N(r)$ is defined as:
$$N = (n - 1) \times 10^6$$
In the neutral atmosphere (troposphere and stratosphere), $N$ relates to meteorological state variables via the empirical **Smith-Weintraub equation**:
$$N = 77.6 \frac{P}{T} + 3.73 \times 10^5 \frac{e}{T^2} - 40.3 \times 10^6 \frac{n_e}{f^2}$$
where:
- $P$: Total atmospheric dry pressure ($\text{hPa}$)
- $T$: Absolute temperature ($\text{K}$)
- $e$: Water vapor partial pressure ($\text{hPa}$)
- $n_e$: Ionospheric electron density ($\text{el/m}^3$)
- $f$: Operating frequency ($\text{Hz}$)

By combining the refractivity profile with the **hydrostatic equation**:
$$\frac{dP}{dz} = -\rho g = -\frac{P M_{\text{air}}}{R^* T} g$$
and the ideal gas equation of state, dry temperature profiles $T_{\text{dry}}(z)$ from the surface to $45\,\text{km}$ altitude are retrieved with sub-Kelvin precision ($\pm 0.4\,\text{K}$ in the upper troposphere / lower stratosphere).

### 6.4 Edge-AI Neural Noise Filter & Sounding Quality Assessment
A lightweight on-board neural classifier analyzes raw signal-to-noise ratio (SNR) fluctuations and multipath interference in the lower troposphere (below $5\,\text{km}$). Soundings are evaluated for:
- Quality flag: `NOMINAL` vs `DEGRADED` (heavy cloud liquid water attenuation).
- Ionospheric correction: Dual-frequency linear combination ($L_1 - L_2$) eliminating first-order dispersive electron delay.
- Atmospheric boundary layer (ABL) height detection via sharp refractivity gradients ($dN/dz < -157\,\text{N-units/km}$).

---

## 7. ORBITAL CONJUNCTION ASSESSMENT & FOSTER-CHAN COLLISION RISK

### 7.1 Encounter Geometry & The 2D $B$-Plane
When tracking orbital debris (e.g., COSMOS-2251, Fengyun-1C fragments), conjunction geometry is analyzed in the **Encounter (B-Plane) coordinate system** centered on the secondary object at the Time of Closest Approach (TCA):
- Relative position: $\mathbf{r}_{\text{rel}} = \mathbf{r}_{\text{pri}} - \mathbf{r}_{\text{sec}}$
- Relative velocity: $\mathbf{v}_{\text{rel}} = \mathbf{v}_{\text{pri}} - \mathbf{v}_{\text{sec}}$
- Unit vector along relative velocity: $\hat{\mathbf{v}} = \frac{\mathbf{v}_{\text{rel}}}{\|\mathbf{v}_{\text{rel}}\|}$
The encounter plane is perpendicular to $\hat{\mathbf{v}}$.

### 7.2 Combined Covariance Projection
Primary and secondary position uncertainties are characterized by $3 \times 3$ Cartesian covariance matrices in ECI coordinates: $\mathbf{C}_{\text{pri}}$ and $\mathbf{C}_{\text{sec}}$. Assuming independent errors, the combined covariance is:
$$\mathbf{C}_{\text{comb}} = \mathbf{C}_{\text{pri}} + \mathbf{C}_{\text{sec}}$$
Projecting $\mathbf{C}_{\text{comb}}$ onto the 2D encounter plane using rotation matrix $\mathbf{M}_{\text{enc}}$ yields the 2D covariance matrix:
$$\mathbf{C}_{2D} = \begin{bmatrix} \sigma_x^2 & \rho \sigma_x \sigma_y \\ \rho \sigma_x \sigma_y & \sigma_y^2 \end{bmatrix}$$

### 7.3 Foster-Chan 2D Gaussian Probability Density Integration
Assuming Gaussian positional error distributions and linear relative motion during the encounter encounter interval, the probability of collision $P_c$ over a combined hard-body circumscribing radius $R_{\text{HBR}} = R_{\text{pri}} + R_{\text{sec}}$ (typically $2.5\,\text{m}$ for CubeSat vs debris) is:
$$P_c = \frac{1}{2\pi \sigma_x \sigma_y \sqrt{1 - \rho^2}} \iint_{x^2 + y^2 \le R_{\text{HBR}}^2} \exp\left( -\frac{1}{2(1-\rho^2)} \left[ \frac{(x - x_e)^2}{\sigma_x^2} - \frac{2\rho(x-x_e)(y-y_e)}{\sigma_x \sigma_y} + \frac{(y-y_e)^2}{\sigma_y^2} \right] \right) dx\, dy$$
where $(x_e, y_e)$ is the projected miss distance offset on the $B$-plane.

PCSS II CubeSat Simulator evaluates $P_c$ using the analytical **Foster-Chan series expansion** and validates against the **Akella-Alfriend formulation**, providing numerical convergence across high-aspect-ratio covariance ellipses.

### 7.4 Autonomous Collision Avoidance Maneuvers (CAM)
If $P_c$ exceeds the international space agency critical threshold ($P_c > 1.0 \times 10^{-4}$) with miss distance $< 500\,\text{m}$, the autonomous CAM engine:
1. Calculates optimal thrust vector direction $\hat{\mathbf{t}}_{\text{burn}}$ along the along-track (tangential) direction to maximize in-plane orbital separation with minimum delta-V.
2. Computes required impulse $\Delta v_{\text{req}}$ (typically $0.15\,\text{m/s}$ to $1.2\,\text{m/s}$) using the **Tsiolkovsky rocket equation**:
   $$\Delta v = I_{\text{sp}} g_0 \ln\left(\frac{m_0}{m_0 - \dot{m}\Delta t}\right)$$
   for the micro-electrospray thruster ($I_{\text{sp}} = 650\,\text{s}$, thrust $F = 1.2\,\text{mN}$).
3. Propagates the post-burn trajectory to verify that secondary miss distance increases to $> 2.5\,\text{km}$ while lowering $P_c < 1.0 \times 10^{-7}$.

---

## 8. RF COMMUNICATIONS LINK BUDGET & GROUND STATION NETWORK

### 8.1 The Friis Transmission Equation
Downlink communications between the spacecraft transceiver and terrestrial ground stations follow the **Friis transmission equation** with atmospheric and polarization loss terms:
$$P_{\text{rx}} = P_{\text{tx}} + G_{\text{tx}} + G_{\text{rx}} - \text{FSPL} - L_{\text{atm}} - L_{\text{pol}} - L_{\text{point}}$$
where:
- $P_{\text{tx}}$: RF transmitter output power ($\text{dBW}$ or $\text{dBm}$; e.g., $+30\,\text{dBm} = 1.0\,\text{W}$).
- $G_{\text{tx}}$: Satellite antenna gain ($\text{dBi}$; patch antenna $G_{\text{tx}} \approx 6.0\,\text{dBi}$).
- $G_{\text{rx}}$: Ground station parabolic dish gain ($\text{dBi}$; $3.0\,\text{m}$ dish at $2.2\,\text{GHz} \approx 34.5\,\text{dBi}$).
- $\text{FSPL}$: Free-Space Path Loss ($\text{dB}$):
  $$\text{FSPL} = 20 \log_{10}(d) + 20 \log_{10}(f) + 20 \log_{10}\left(\frac{4\pi}{c}\right) = 20 \log_{10}(d_{\text{km}}) + 20 \log_{10}(f_{\text{MHz}}) + 32.44$$
  At $d = 1200\,\text{km}$ slant range and $f = 2245\,\text{MHz}$ (S-band), $\text{FSPL} \approx 161.05\,\text{dB}$.
- $L_{\text{atm}}$: Atmospheric absorption (oxygen and water vapor molecular resonance; $\sim 0.35\,\text{dB}$ at zenith).
- $L_{\text{pol}}$: Polarization mismatch loss ($\sim 0.5\,\text{dB}$).

### 8.2 Carrier-to-Noise Density ($C/N_0$) & Link Margin
System noise temperature $T_{\text{sys}} = T_{\text{ant}} + T_{\text{LNA}} + T_{\text{cable}} \approx 135\,\text{K}$. The noise spectral density is:
$$N_0 = k_B T_{\text{sys}} \quad (\text{W/Hz})$$
where $k_B = 1.380649 \times 10^{-23}\,\text{J/K}$ is Boltzmann's constant ($-228.6\,\text{dBW}/(\text{Hz}\cdot\text{K})$).

The carrier-to-noise density ratio:
$$\frac{C}{N_0} = P_{\text{rx}} - N_0 \quad (\text{dB-Hz})$$
The energy per bit to noise power spectral density ratio $E_b/N_0$ at data rate $R_b$ ($\text{bps}$):
$$\frac{E_b}{N_0} = \frac{C}{N_0} - 10 \log_{10}(R_b)$$
Link margin $M$:
$$M = \frac{E_b}{N_0} - \left(\frac{E_b}{N_0}\right)_{\text{req}}$$
A positive margin $M \ge 3.0\,\text{dB}$ ensures bit error rate $\text{BER} < 10^{-6}$ for QPSK modulation with rate $1/2$ LDPC forward error correction.

### 8.3 Relativistic Doppler Frequency Shift
Due to satellite orbital velocities approaching $v \approx 7.6\,\text{km/s}$, the received frequency $f_{\text{rx}}$ at the ground station exhibits a time-varying Doppler shift:
$$f_{\text{rx}}(t) = f_0 \left( 1 - \frac{\dot{\rho}(t)}{c} \right)$$
where $\dot{\rho}(t) = \frac{\mathbf{r}_{\text{sat}} - \mathbf{r}_{\text{gs}}}{\|\mathbf{r}_{\text{sat}} - \mathbf{r}_{\text{gs}}\|} \cdot (\mathbf{v}_{\text{sat}} - \mathbf{v}_{\text{gs}})$ is the range-rate. For S-band ($2.2\,\text{GHz}$), the Doppler offset sweeps over $\pm 55\,\text{kHz}$ during a pass, tracked via on-board digital phase-locked loops (DPLL).

---

## 9. FLIGHT SOFTWARE ARCHITECTURE & VIRTUAL TWIN ENGINE

### 9.1 High-Rate Decoupled Physics Loop
The simulation engine runs on a deterministic fixed-rate numerical integration cycle decoupled from UI rendering:
- **Simulation Frequency**: $20\,\text{Hz}$ ($\Delta t_0 = 50\,\text{ms}$).
- **Time Warp Multipliers**: $1\times, 5\times, 10\times, 30\times, 60\times, 300\times$.
- **Numerical Integrator**: Explicit 4th-order Runge-Kutta (RK4) for quaternion rotational dynamics; symplectic Störmer-Verlet / Keplerian propagation for orbital states.
- **State Immutability**: Centralized atomic Zustand store with synchronized circular telemetry buffers (last 240 telemetry frames for live high-rate charting).

### 9.2 Subsystem Inter-Coupling Matrix
All physical subsystems are dynamically coupled in real time:
```
[Orbit / SGP4] ---> Sun Vector / Eclipse ---> [Solar Flux Engine]
       |                                              |
       v                                              v
[Harris-Priester Drag]                         [EPS Power Bus]
       ^                                              |
       | (Attitude Area)                              v
[ADCS Quaternions] <--- Control Torques --- [Battery / Rail Voltages]
       |                                              |
       v                                              v
[Thruster Firing] ---> Heat Generation ---> [Thermal Nodal Network]
                                                      |
                                                      v
                                            [Louver Aperture / Derating]
```

---

## 10. FLIGHT OPERATIONS PROCEDURES & EMERGENCY CHECKLISTS

### 10.1 Nominal Commissioning Phase (LEOP)
1. **Separation Sense**: Deployment switch open circuit confirmed.
2. **Timer Hold**: 30-minute RF silence compliant with range safety regulations.
3. **Solar Array Deployment**: Thermal knife activation; verify hinge micro-switch continuity.
4. **B-Dot Detumbling**: Enable magnetorquers; confirm angular rate $< 0.5^\circ/\text{s}$ within two orbits.
5. **Sun Acquisition**: Slew solar panels normal to $\hat{\mathbf{s}}$; confirm battery charge current $> 1.2\,\text{A}$.
6. **Ground Station First Contact**: Downlink initial health and status (H&S) beacon over Svalbard.

### 10.2 Contingency Emergency Procedures (FDIR)
- **CONT-01: Thermal Excursion (> 65°C on OBC)**:
  1. Trigger Active Thermal Derating (throttle clock to $55\%$).
  2. Commanded Louver Aperture to $100\%$ Open.
  3. Set pyrolytic heat strap to `HIGH_CONDUCTION`.
  4. Slew attitude to edge-on solar angle (minimize projected area).
- **CONT-02: Severe Eclipse Under-Temperature (< 0°C on Battery)**:
  1. Verify Survival Patch Heater mode set to `AUTO`.
  2. Power off non-essential payloads (GNSS-RO front-end).
  3. Close radiator louvers to $0\%$ aperture to preserve core enthalpy.
- **CONT-03: Critical Conjunction Alert ($P_c > 10^{-4}$)**:
  1. Arm cold-gas / electrospray thruster.
  2. Initiate chamber preheater ($60\,\text{s}$ cycle).
  3. Execute automated in-plane $\Delta v$ burn along tangential velocity vector.
  4. Verify post-burn B-plane miss distance $> 2.0\,\text{km}$.

---

## 11. FORMAL MATHEMATICAL NOMENCLATURE

| Symbol | Physical Description | SI Unit |
| :--- | :--- | :--- |
| $\mu$ | Earth Gravitational Parameter ($3.986004418 \times 10^{14}$) | $\text{m}^3/\text{s}^2$ |
| $R_E$ | Earth Equatorial Radius (WGS-84: $6378137.0$) | $\text{m}$ |
| $J_2$ | Earth Second Zonal Gravitational Harmonic ($1.08263 \times 10^{-3}$) | Dimensionless |
| $\mathbf{q}$ | Unit Quaternion Orientation Vector $[q_0, q_1, q_2, q_3]^T$ | Dimensionless |
| $\boldsymbol{\omega}$ | Spacecraft Body Angular Velocity Vector | $\text{rad/s}$ |
| $\mathbf{I}$ | Spacecraft Mass Moment of Inertia Tensor | $\text{kg}\cdot\text{m}^2$ |
| $\mathbf{B}$ | Local Earth Magnetic Flux Density Vector | $\text{Tesla}$ ($\text{T}$) |
| $\mathbf{m}$ | Spacecraft Magnetic Dipole Moment Vector | $\text{A}\cdot\text{m}^2$ |
| $\rho$ | Thermospheric Atmospheric Mass Density | $\text{kg/m}^3$ |
| $C_d$ | Free-Molecular Aerodynamic Drag Coefficient ($\sim 2.2$) | Dimensionless |
| $S_0$ | Total Solar Irradiance at 1 AU ($1361.0$) | $\text{W/m}^2$ |
| $\sigma$ | Stefan-Boltzmann Radiation Constant ($5.670374 \times 10^{-8}$) | $\text{W}/(\text{m}^2\cdot\text{K}^4)$ |
| $\epsilon$ | Surface Emissivity | Dimensionless |
| $\alpha_s$ | Surface Solar Absorptivity | Dimensionless |
| $n(r)$ | Atmospheric Index of Refraction | Dimensionless |
| $N$ | Atmospheric Refractivity $(n-1) \times 10^6$ | $\text{N-units}$ |
| $P_c$ | Orbital Conjunction Probability of Collision | Dimensionless |
| $\text{FSPL}$ | Free Space Path Loss | $\text{dB}$ |

---

### Authoritative Reference Citations
1. **Vallado, D. A.** (2013). *Fundamentals of Astrodynamics and Applications* (4th ed.). Microcosm Press / Springer.
2. **Wertz, J. R.** (1978). *Spacecraft Attitude Determination and Control*. D. Reidel Publishing Company.
3. **Harris, I., & Priester, W.** (1962). *Theoretical Models for the Solar-Cycle Variation of the Upper Atmosphere*. Journal of Geophysical Research, 67(12), 4585–4591.
4. **Kursinski, E. R., et al.** (1997). *Observing Earth's atmosphere with radio occultation measurements using the Global Positioning System*. Journal of Geophysical Research: Atmospheres, 102(D19), 23429–23465.
5. **Foster, J. L., & Estes, H. S.** (1992). *A Parametric Analysis of Orbital Debris Collision Probability and Maneuver Utility*. NASA JSC-25898.
6. **Smith, E. K., & Weintraub, S.** (1953). *The Constants in the Equation for Atmospheric Refractive Index at Radio Frequencies*. Proceedings of the IRE, 41(8), 1035–1037.

---

## Deployment

This is a static Vite application and is ready to deploy to Vercel.

1. Import the repository in Vercel, or run `vercel` from the project root.
2. Vercel uses `npm ci`, then runs `npm run build` and publishes `dist` (configured in `vercel.json`).
3. Use Node.js 20.19 or newer; the required version is declared in `.nvmrc` and `package.json`.

The simulator currently has no required production environment variables. The values in `.env.example` are legacy AI Studio placeholders and are not needed by this static deployment.
