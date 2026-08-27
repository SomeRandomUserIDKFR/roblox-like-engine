import type { Object3D } from "three";
import { R6Character } from "../player/R6Character";
import type { NetPeerPose } from "./NetClient";

/** Lightweight remote avatar (R6 body, no local input). */
export class RemoteAvatar {
  readonly character = new R6Character();
  readonly group: Object3D;
  name: string;

  constructor(peer: NetPeerPose) {
    this.name = peer.name;
    this.group = this.character.getObject3D();
    this.group.position.set(peer.x, peer.y, peer.z);
    for (const part of Object.values(this.character.parts)) {
      part.setMaterialPreset("plastic");
    }
  }

  apply(peer: NetPeerPose) {
    this.name = peer.name;
    this.group.position.set(peer.x, peer.y, peer.z);
    this.character.root.rotation.y = peer.yaw;
  }

  dispose() {
    this.group.removeFromParent();
  }
}
