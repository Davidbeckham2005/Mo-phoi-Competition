export function asyncHandler(fn) {
  return (req, res) => {
    try {
      const result = fn(req, res);
      if (result && typeof result.then === "function") {
        result.then((data) => {
          if (!res.headersSent && data !== undefined) res.json(data);
        }).catch((err) => {
          res.status(err.status || 500).json({ error: err.message });
        });
      } else if (!res.headersSent && result !== undefined) {
        res.json(result);
      }
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  };
}
