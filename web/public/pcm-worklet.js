// Copia cada bloque del micrófono (128 muestras) al hilo principal.
class CapturaPcm extends AudioWorkletProcessor {
  process(inputs) {
    const canal = inputs[0]?.[0];
    if (canal) this.port.postMessage(canal.slice(0));
    return true;
  }
}
registerProcessor('captura-pcm', CapturaPcm);
