export class RealtimeRoomRegistry {
  private readonly counts = new Map<string, number>();

  retain(roomId: string) {
    const count = this.counts.get(roomId) || 0;
    this.counts.set(roomId, count + 1);
    return count === 0;
  }

  release(roomId: string) {
    const count = this.counts.get(roomId) || 0;
    if (count <= 1) {
      this.counts.delete(roomId);
      return count === 1;
    }
    this.counts.set(roomId, count - 1);
    return false;
  }

  has(roomId: string) {
    return this.counts.has(roomId);
  }

  activeRoomIds() {
    return [...this.counts.keys()];
  }

  clear() {
    this.counts.clear();
  }
}
