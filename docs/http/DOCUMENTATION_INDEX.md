# Documentation Index

Quick navigation for all HTTP Server Framework documentation.

## 📚 Core Documentation

### [README.md](README.md) - **Start Here!**
**What it is:** Main project overview and quick start guide
**Read this for:**
- What the framework does
- Quick start examples
- API reference
- Installation instructions

**Best for:** New users, getting started

---

### [MIDDLEWARE_INTEGRATION.md](middleware/MIDDLEWARE_INTEGRATION.md)
**What it is:** Complete middleware usage guide
**Read this for:**
- How middleware works
- Available middleware
- Middleware ordering
- Configuration examples

**Best for:** Building applications with middleware

---

## 🚧 Development Documentation

### [TODO.md](TODO.md) - **Implementation Roadmap**
**What it is:** Complete list of planned features and improvements
**Read this for:**
- What features are coming
- Priority ranking
- Implementation details
- Timeline estimates

**Best for:** Contributors, understanding future direction

**Quick reference:**
- 🔴 Critical issues (blocking)
- 🟡 Medium priority
- 🟢 Low priority / Future

---

### [KNOWN_ISSUES.md](KNOWN_ISSUES.md) - **Current Limitations**
**What it is:** Active bugs and limitations
**Read this for:**
- Current broken features
- Workarounds
- Severity levels
- Fix timelines

**Best for:** Troubleshooting, understanding limitations

**Critical issues:**
1. Middleware adapter pattern broken
2. Health check route not registered

---

### [CONTRIBUTING.md](CONTRIBUTING.md) - **Contributor Guide**
**What it is:** How to contribute to the project
**Read this for:**
- Development setup
- Code style guidelines
- Testing requirements
- PR process

**Best for:** Contributors, code reviewers

**Includes:**
- Good first issues
- Testing guidelines
- Documentation standards
- Code review checklist

---

### [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md)
**What it is:** Status of middleware integration
**Read this for:**
- What middleware is integrated
- Changes made during integration
- Current integration status

**Best for:** Understanding what's available now

---

## 📖 Reading Order

### For New Users
1. **README.md** - Understand what the framework is
2. **MIDDLEWARE_INTEGRATION.md** - Learn how to use it
3. **KNOWN_ISSUES.md** - Understand current limitations

### For Contributors
1. **CONTRIBUTING.md** - Setup and guidelines
2. **TODO.md** - What needs to be done
3. **KNOWN_ISSUES.md** - Current bugs to fix
4. **README.md** - API reference

### For Troubleshooting
1. **KNOWN_ISSUES.md** - Is this a known problem?
2. **TODO.md** - Is it planned?
3. **MIDDLEWARE_INTEGRATION.md** - Am I using it correctly?
4. **README.md** - Check the examples

---

## 🎯 Quick Links by Topic

### Getting Started
- [Installation](README.md#installation)
- [Quick Start](README.md#quick-start)
- [Basic Examples](README.md#examples)

### API Reference
- [Server API](README.md#server)
- [Routing API](README.md#routing)
- [Response Helpers](README.md#response-helpers)
- [Middleware API](README.md#middleware)

### Middleware
- [Available Middleware](middleware/MIDDLEWARE_INTEGRATION.md#available-middleware)
- [Middleware Ordering](middleware/MIDDLEWARE_INTEGRATION.md#middleware-order)
- [Custom Middleware](README.md#middleware)

### Security
- [Security Features](README.md#security)
- [Security Middleware](middleware/MIDDLEWARE_INTEGRATION.md#security-middleware)
- [Security Best Practices](TODO.md#documentation-needs)

### Performance
- [Performance Tips](README.md#performance-tips)
- [Performance Monitoring](middleware/MIDDLEWARE_INTEGRATION.md#performance-monitoring)
- [Benchmarks](TODO.md#performance-benchmarks) (planned)

### Deployment
- [Deno Deploy](README.md#deno-deploy)
- [Docker](README.md#docker)
- [Systemd](README.md#systemd-service)

### Contributing
- [How to Contribute](CONTRIBUTING.md)
- [Code Style](CONTRIBUTING.md#code-style)
- [Testing](CONTRIBUTING.md#testing-guidelines)
- [Good First Issues](CONTRIBUTING.md#good-first-issues)

### Issues & Bugs
- [Known Issues List](KNOWN_ISSUES.md)
- [Critical Issues](KNOWN_ISSUES.md#critical-issues-preventing-production-use)
- [Workarounds](KNOWN_ISSUES.md#workarounds-summary)
- [Reporting Issues](KNOWN_ISSUES.md#how-to-report-new-issues)

### Future Plans
- [Roadmap](README.md#roadmap)
- [TODO List](TODO.md)
- [Feature Requests](TODO.md#low-priority--future-enhancements)

---

## 📊 Documentation Statistics

| Document | Size | Purpose | Audience |
|----------|------|---------|----------|
| README.md | 12 KB | Overview & API | All users |
| MIDDLEWARE_INTEGRATION.md | 9.8 KB | Middleware guide | Developers |
| TODO.md | 13 KB | Feature roadmap | Contributors |
| KNOWN_ISSUES.md | 7.0 KB | Bug tracker | All users |
| CONTRIBUTING.md | 11 KB | Contributor guide | Contributors |
| INTEGRATION_SUMMARY.md | 7.3 KB | Integration status | Developers |

**Total documentation:** ~60 KB across 6 files

---

## 🔍 Search by Task

### "I want to..."

**...build a REST API**
→ [README.md - REST API Example](README.md#rest-api)

**...add middleware**
→ [MIDDLEWARE_INTEGRATION.md](middleware/MIDDLEWARE_INTEGRATION.md)

**...contribute code**
→ [CONTRIBUTING.md](CONTRIBUTING.md)

**...report a bug**
→ [KNOWN_ISSUES.md - How to Report](KNOWN_ISSUES.md#how-to-report-new-issues)

**...understand what's broken**
→ [KNOWN_ISSUES.md - Critical Issues](KNOWN_ISSUES.md#critical-issues-preventing-production-use)

**...see what features are planned**
→ [TODO.md](TODO.md)

**...deploy to production**
→ [README.md - Deployment](README.md#deployment) (⚠️ Not production-ready yet)

**...add security headers**
→ [MIDDLEWARE_INTEGRATION.md - Security](middleware/MIDDLEWARE_INTEGRATION.md)

**...parse request bodies**
→ [README.md - Body Parsing](README.md#body-parsing)

**...serve static files**
→ [README.md - Static Files](README.md#static-files)

**...validate requests**
→ [README.md - Request Validation](README.md#request-validation)

**...handle errors**
→ [README.md - Error Handling](README.md#error-handling)

**...monitor performance**
→ [MIDDLEWARE_INTEGRATION.md - Performance](middleware/MIDDLEWARE_INTEGRATION.md)

---

## 📝 Documentation Maintenance

### When to Update Each Doc

**README.md:** Update when...
- Adding/removing features
- API changes
- New examples added
- Version bumps

**MIDDLEWARE_INTEGRATION.md:** Update when...
- Adding new middleware
- Changing middleware behavior
- Updating configuration options

**TODO.md:** Update when...
- Starting new work
- Completing tasks
- Reprioritizing
- Adding new feature requests

**KNOWN_ISSUES.md:** Update when...
- Discovering new bugs
- Fixing existing bugs
- Finding workarounds
- Issue severity changes

**CONTRIBUTING.md:** Update when...
- Process changes
- Adding new guidelines
- Updating code standards

**INTEGRATION_SUMMARY.md:** Update when...
- Completing integrations
- Changing integration approach

---

## 🤔 FAQ

**Q: Which doc should I read first?**
A: Start with [README.md](README.md)

**Q: Where are the examples?**
A: [README.md - Examples](README.md#examples) and [example-usage.ts](example-usage.ts)

**Q: Is this production-ready?**
A: No - see [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for why

**Q: How do I contribute?**
A: Read [CONTRIBUTING.md](CONTRIBUTING.md)

**Q: What features are coming?**
A: See [TODO.md](TODO.md) and [README.md - Roadmap](README.md#roadmap)

**Q: Where's the API documentation?**
A: [README.md - API Reference](README.md#api-reference)

**Q: How do I report bugs?**
A: [KNOWN_ISSUES.md - Reporting](KNOWN_ISSUES.md#how-to-report-new-issues)

---

## 🔗 External Resources

### Deno Documentation
- [Deno Manual](https://deno.land/manual)
- [Deno Standard Library](https://deno.land/std)
- [Deno Deploy](https://deno.com/deploy)

### HTTP Concepts
- [MDN HTTP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP)
- [REST API Tutorial](https://restfulapi.net/)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 📞 Getting Help

| Question Type | Where to Look |
|--------------|---------------|
| "How do I...?" | README.md, MIDDLEWARE_INTEGRATION.md |
| "Is this broken?" | KNOWN_ISSUES.md |
| "When will X be done?" | TODO.md |
| "How do I contribute?" | CONTRIBUTING.md |
| "What changed?" | INTEGRATION_SUMMARY.md |

---

## 📅 Last Updated

- **README.md:** 2025-10-31
- **MIDDLEWARE_INTEGRATION.md:** 2025-10-30
- **TODO.md:** 2025-10-31
- **KNOWN_ISSUES.md:** 2025-10-31
- **CONTRIBUTING.md:** 2025-10-31
- **INTEGRATION_SUMMARY.md:** 2025-10-30

---

*This index is automatically updated when documentation changes*

**Framework Version:** 0.1.0-alpha
