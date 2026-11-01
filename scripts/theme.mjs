// Shared palette for every generated image. "Signal" is the event moving through
// the system; "stream" is the system it moves through.
export const themes = {
  dark: {
    text: '#E6EDF3',
    muted: '#8B949E',
    border: '#30363D',
    surface: '#161B22',
    signal: '#F5A524',
    stream: '#2DD4BF',
    series: ['#F5A524', '#2DD4BF', '#7AA2F7', '#C4A7E7', '#8B949E'],
  },
  light: {
    text: '#1F2328',
    muted: '#57606A',
    border: '#D0D7DE',
    surface: '#F6F8FA',
    signal: '#B45309',
    stream: '#0F766E',
    series: ['#B45309', '#0F766E', '#1D4ED8', '#7C3AED', '#57606A'],
  },
};

export const MONO = "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace";
export const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif";

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
