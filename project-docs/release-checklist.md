# Release Checklist

## Version Update
- [ ] Update `APP_VERSION` in `src/js/config.js`
- [ ] Update `CACHE_NAME` in `sw.js`
- [ ] Update version in `CLAUDE.md`
- [ ] Update `CHANGELOG.md` with changes and date

## Release
- [ ] Commit: `git commit -m "chore: bump version to X.Y.Z"`
- [ ] Tag: `git tag vX.Y.Z`
- [ ] Push: `git push && git push --tags`

## Verify
- [ ] Test version displays in header
- [ ] Test basic functionality

## Version Numbering
- **Alpha**: `0.x.y` (current)
- **Stable**: `1.0.0+` (after public release)
