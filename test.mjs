try {
  JSON.parse("<!doctype html><html><body></body></html>");
} catch(e) {
  console.log(e.message);
}
