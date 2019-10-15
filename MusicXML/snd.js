'use strict'

const TEMPO_MUL = 120 / 118

function noteFreq(n) {
    return 440 * Math.pow(2, (n - 69) / 12)
}

let ac
let out

function init() {
    ac = new AudioContext

    out = ac.createGain()
    out.gain.value = 0.2
    // out.connect(ac.destination)
    // return Promise.resolve()
    return reverb()
}

function playNote(n, start, end) {
    const freq = noteFreq(n)
    start *= TEMPO_MUL
    end *= TEMPO_MUL

    const osc = ac.createOscillator()
    osc.type = 'square'
    osc.frequency.value = freq
    decay(osc, start).connect(out)
    osc.start(ac.currentTime + start)
    osc.stop(ac.currentTime + end)
}

function decay(osc, start) {
    const env = ac.createGain()
    env.gain.setValueAtTime(0.5, ac.currentTime + start)
    env.gain.exponentialRampToValueAtTime(0.00001, ac.currentTime + start + 1.5 * TEMPO_MUL)
    osc.connect(env)
    return env
}

/* --- Experimental --- */

function reverb() {
    const conv = ac.createConvolver()
    const dry = ac.createGain()
    const wet = ac.createGain()

    dry.gain.value = 2 / 3
    wet.gain.value = 1 / 3
    out.connect(conv)
    out.connect(dry)
    conv.connect(wet)
    dry.connect(ac.destination)
    wet.connect(ac.destination)

    return new Promise(function (resolve) {
        generateReverb({
            audioContext: ac,
            fadeIn: 0.00001,
            decay: 1.5 * TEMPO_MUL,
            lpFreqStart: 16000,
            lpFreqEnd: 1000,
        }, function (buf) {
            conv.buffer = buf
            resolve()
        })
    })
}

function lowpass(osc) {
    const filter = ac.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = noteFreq(60)
    osc.connect(filter)
    return filter
}

function playChord(n, start, end) {
    const freq = noteFreq(n)
    /* +7 is a fifth above the playing note,
     * while -5 is also the fifth but one octave below. */
    const freq1 = noteFreq(n + 7)
    const freq2 = noteFreq(n - 5)
    start *= TEMPO_MUL
    end *= TEMPO_MUL

    const osc = ac.createOscillator()
    osc.type = 'square'
    osc.frequency.value = freq
    osc.connect(out)
    osc.start(ac.currentTime + start)
    osc.stop(ac.currentTime + end)

    const step = (2 / 96) * TEMPO_MUL
    for (let a = 1; a * step < (end - start); ++a) {
        switch (a % 4) {
            case 0:
            case 2:
                osc.frequency.setValueAtTime(freq, ac.currentTime + start + a * step)
                continue
            case 1:
                osc.frequency.setValueAtTime(freq1, ac.currentTime + start + a * step)
                continue
            case 3:
                osc.frequency.setValueAtTime(freq2, ac.currentTime + start + a * step)
                continue
        }
    }
}
