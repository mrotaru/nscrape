const beautify = require("js-beautify").html;

const delay = milliseconds => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, milliseconds);
  });
};

const beautifyHtml = html =>
  beautify(html, {
    preserve_newlines: false,
    indent_size: 2,
    wrap_line_length: 80,
  });

module.exports = {
  delay,
  beautifyHtml,
};
