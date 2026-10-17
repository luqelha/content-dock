function reviewLifecycle(policy, version, now = new Date()) {
  const [major, minor] = version.split(".").map(Number);
  const support = policy.nodeSupport[String(major)];
  const failures = [];
  const deadline = (value) => {
    const date = new Date(value + "T00:00:00Z");
    return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
      ? date
      : null;
  };
  const end = support && deadline(support.end);
  const review = deadline(policy.reviewBy);
  if (!support || (major === 22 && minor < 12) || !end || now >= end)
    failures.push("Node runtime is outside the reviewed support window");
  if (!review || now >= review)
    failures.push("Dependency lifecycle policy needs review");
  return failures;
}
module.exports = { reviewLifecycle };
