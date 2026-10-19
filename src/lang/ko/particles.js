/* Korean particles and the roles they give the word before them (mirrors tools/casus_build/ko/parse.py PARTICLES). */
export const PARTICLES = {
  은: 'top', 는: 'top', 이: 'sbj', 가: 'sbj', 께서: 'sbj', 을: 'obj', 를: 'obj', 에: 'tgt', 에게: 'tgt', 한테: 'tgt', 께: 'tgt',
  에서: 'loc', 의: 'gen', 와: 'com', 과: 'com', 하고: 'com', 랑: 'com', 이랑: 'com', 로: 'src', 으로: 'src', 부터: 'src', 까지: 'src',
  도: null, 만: null, 보다: null, 처럼: null, 요: null,
  // stacked particles: the role is the first one's (때에는)
  에는: 'tgt', 에서는: 'loc', 에게는: 'tgt', 한테는: 'tgt', 으로는: 'src', 로는: 'src', 와는: 'com', 과는: 'com', 하고는: 'com', 에도: 'tgt', 에서도: 'loc', 에게도: 'tgt', 한테도: 'tgt', 으로도: 'src', 로도: 'src', 까지는: 'src', 부터는: 'src', 까지도: 'src', 에만: 'tgt', 에서만: 'loc', 에서부터: 'src', 께서는: 'sbj', 께서도: 'sbj', 마다: null, 밖에: null, 조차: null, 마저: null, 이나: null, 나: null, 만은: null,
};
