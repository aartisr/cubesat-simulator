import { Quaternion, Vector3D, EulerAngles } from '../../types/telemetry';

export class QuaternionMath {
  public static identity(): Quaternion {
    return { w: 1, x: 0, y: 0, z: 0 };
  }

  public static normalize(q: Quaternion): Quaternion {
    const len = Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);
    if (len < 1e-12) return { w: 1, x: 0, y: 0, z: 0 };
    return {
      w: q.w / len,
      x: q.x / len,
      y: q.y / len,
      z: q.z / len,
    };
  }

  public static multiply(a: Quaternion, b: Quaternion): Quaternion {
    return {
      w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
      x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
      y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
      z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    };
  }

  public static conjugate(q: Quaternion): Quaternion {
    return { w: q.w, x: -q.x, y: -q.y, z: -q.z };
  }

  public static fromAxisAngle(axis: Vector3D, angleRad: number): Quaternion {
    const half = angleRad * 0.5;
    const s = Math.sin(half);
    const len = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z) || 1;
    return {
      w: Math.cos(half),
      x: (axis.x / len) * s,
      y: (axis.y / len) * s,
      z: (axis.z / len) * s,
    };
  }

  public static rotateVector(q: Quaternion, v: Vector3D): Vector3D {
    // v' = q * v * q^-1
    const qv: Quaternion = { w: 0, x: v.x, y: v.y, z: v.z };
    const qNorm = this.normalize(q);
    const res = this.multiply(this.multiply(qNorm, qv), this.conjugate(qNorm));
    return { x: res.x, y: res.y, z: res.z };
  }

  public static rotateVectorInverse(q: Quaternion, v: Vector3D): Vector3D {
    // v_body = q^-1 * v_eci * q
    const qInv = this.conjugate(this.normalize(q));
    return this.rotateVector(qInv, v);
  }

  public static toEuler(q: Quaternion): EulerAngles {
    const norm = this.normalize(q);
    const { w, x, y, z } = norm;

    // Roll (x-axis rotation)
    const sinr_cosp = 2 * (w * x + y * z);
    const cosr_cosp = 1 - 2 * (x * x + y * y);
    const roll = Math.atan2(sinr_cosp, cosr_cosp) * (180 / Math.PI);

    // Pitch (y-axis rotation)
    const sinp = 2 * (w * y - z * x);
    let pitch: number;
    if (Math.abs(sinp) >= 1) {
      pitch = (Math.sign(sinp) * Math.PI) / 2 * (180 / Math.PI); // gimbal lock
    } else {
      pitch = Math.asin(sinp) * (180 / Math.PI);
    }

    // Yaw (z-axis rotation)
    const siny_cosp = 2 * (w * z + x * y);
    const cosy_cosp = 1 - 2 * (y * y + z * z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp) * (180 / Math.PI);

    return { roll, pitch, yaw };
  }

  public static slerp(qa: Quaternion, qb: Quaternion, t: number): Quaternion {
    let cosHalfTheta = qa.w * qb.w + qa.x * qb.x + qa.y * qb.y + qa.z * qb.z;

    let target = { ...qb };
    if (cosHalfTheta < 0) {
      target = { w: -target.w, x: -target.x, y: -target.y, z: -target.z };
      cosHalfTheta = -cosHalfTheta;
    }

    if (Math.abs(cosHalfTheta) >= 1.0) {
      return qa;
    }

    const halfTheta = Math.acos(cosHalfTheta);
    const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

    if (Math.abs(sinHalfTheta) < 0.001) {
      return this.normalize({
        w: qa.w * (1 - t) + target.w * t,
        x: qa.x * (1 - t) + target.x * t,
        y: qa.y * (1 - t) + target.y * t,
        z: qa.z * (1 - t) + target.z * t,
      });
    }

    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

    return {
      w: qa.w * ratioA + target.w * ratioB,
      x: qa.x * ratioA + target.x * ratioB,
      y: qa.y * ratioA + target.y * ratioB,
      z: qa.z * ratioA + target.z * ratioB,
    };
  }

  /**
   * Integrates quaternion forward by dt using angular velocity omega (rad/s)
   * dq/dt = 0.5 * q * [0, omega]
   */
  public static integrate(q: Quaternion, omega: Vector3D, dtSeconds: number): Quaternion {
    const omegaMag = Math.sqrt(omega.x * omega.x + omega.y * omega.y + omega.z * omega.z);
    if (omegaMag < 1e-12) return q;

    const deltaAngle = omegaMag * dtSeconds;
    const axis: Vector3D = {
      x: omega.x / omegaMag,
      y: omega.y / omegaMag,
      z: omega.z / omegaMag,
    };

    const deltaQ = this.fromAxisAngle(axis, deltaAngle);
    return this.normalize(this.multiply(q, deltaQ));
  }

  public static angleBetween(q1: Quaternion, q2: Quaternion): number {
    const dot = Math.abs(q1.w * q2.w + q1.x * q2.x + q1.y * q2.y + q1.z * q2.z);
    const clamped = Math.min(1.0, Math.max(-1.0, dot));
    return 2 * Math.acos(clamped) * (180 / Math.PI);
  }
}
