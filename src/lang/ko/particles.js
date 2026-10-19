/* Korean particles and the roles they give the word before them (mirrors tools/casus_build/ko/parse.py PARTICLES). */
export const PARTICLES = {
  은: 'top', 는: 'top', 이: 'sbj', 가: 'sbj', 께서: 'sbj', 을: 'obj', 를: 'obj', 에: 'tgt', 에게: 'tgt', 한테: 'tgt', 께: 'tgt',
  에서: 'loc', 의: 'gen', 와: 'com', 과: 'com', 하고: 'com', 랑: 'com', 이랑: 'com', 로: 'src', 으로: 'src', 부터: 'src', 까지: 'src',
  도: null, 만: null, 보다: null, 처럼: null, 요: null,
};
