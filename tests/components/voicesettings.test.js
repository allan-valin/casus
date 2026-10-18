// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import VoiceSettings from '../../src/app/components/VoiceSettings.svelte';

function fakeVoice(ready = false) {
  let isReady = ready;
  return {
    natural: { voiceId: 'de_DE-thorsten-medium', name: 'Thorsten', sizeMB: 63 },
    naturalReady: () => isReady,
    downloadNatural: vi.fn(async (progress) => { progress(0.5); progress(1); isReady = true; }),
    removeNatural: vi.fn(async () => { isReady = false; }),
    onchange: () => () => {},
  };
}

describe('VoiceSettings', () => {
  it('names the voice and its size, and downloads only when clicked', async () => {
    const voice = fakeVoice();
    const { container } = render(VoiceSettings, { voice });
    expect(container.textContent).toMatch(/Thorsten/);
    expect(container.textContent).toMatch(/63 MB/);
    expect(voice.downloadNatural).not.toHaveBeenCalled();
    await fireEvent.click(container.querySelector('button.download'));
    await tick(); await tick();
    expect(voice.downloadNatural).toHaveBeenCalledTimes(1);
    expect(container.querySelector('button.remove')).not.toBe(null);
  });
  it('offers removal when the voice is stored', async () => {
    const voice = fakeVoice(true);
    const { container } = render(VoiceSettings, { voice });
    await fireEvent.click(container.querySelector('button.remove'));
    await tick(); await tick();
    expect(voice.removeNatural).toHaveBeenCalledTimes(1);
    expect(container.querySelector('button.download')).not.toBe(null);
  });
  it('renders nothing for a language without a natural voice', () => {
    const { container } = render(VoiceSettings, { voice: { natural: null } });
    expect(container.textContent.trim()).toBe('');
  });
});
