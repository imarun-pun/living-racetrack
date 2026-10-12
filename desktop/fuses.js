// Runs after packaging (electron-builder afterPack): switches off Electron features an attacker
// could use to run their own code inside Lapwall (run-as-Node, NODE_OPTIONS, the inspector)
// and makes the app load only from its packaged archive.
const path = require('path');
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');

module.exports = async function afterPack(context) {
  const { appOutDir, electronPlatformName, packager } = context;
  const name = packager.appInfo.productFilename;
  const exe = electronPlatformName === 'darwin' ? path.join(appOutDir, `${name}.app`)
    : electronPlatformName === 'win32' ? path.join(appOutDir, `${name}.exe`)
    : path.join(appOutDir, packager.executableName);
  await flipFuses(exe, {
    version: FuseVersion.V1,
    resetAdHocDarwinSignature: electronPlatformName === 'darwin',
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.EnableCookieEncryption]: true
  });
};
