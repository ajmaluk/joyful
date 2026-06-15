export default class SwitchableStream extends TransformStream<Uint8Array, Uint8Array> {
  private _controller: TransformStreamDefaultController<Uint8Array> | null = null;
  private _currentReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private _switches = 0;
  private _closed = false;
  private _pumpPromise: Promise<void> = Promise.resolve();

  constructor() {
    let controllerRef: TransformStreamDefaultController<Uint8Array> | undefined;

    super({
      start(controller) {
        controllerRef = controller;
      },
    });

    if (controllerRef === undefined) {
      throw new Error('Controller not properly initialized');
    }

    this._controller = controllerRef;
  }

  async switchSource(newStream: ReadableStream<Uint8Array>) {
    if (this._closed) {
      return;
    }

    if (this._currentReader) {
      try {
        await this._currentReader.cancel();
      } catch {
        // reader may already be cancelled/errored
      }
    }

    this._currentReader = newStream.getReader();

    this._pumpPromise = this._pumpStream();

    this._switches++;
  }

  private async _pumpStream() {
    if (!this._currentReader || !this._controller) {
      return;
    }

    try {
      while (true) {
        const { done, value } = await this._currentReader.read();

        if (done) {
          break;
        }

        try {
          this._controller.enqueue(value);
        } catch {
          // controller may be terminated/errored
          break;
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  async close() {
    if (this._closed) {
      return;
    }

    this._closed = true;

    if (this._currentReader) {
      try {
        await this._currentReader.cancel();
      } catch {
        // reader may already be cancelled
      }
    }

    try {
      this._controller?.terminate();
    } catch {
      // controller may already be errored
    }

    await this._pumpPromise;
  }

  get switches() {
    return this._switches;
  }
}
