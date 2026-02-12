# stolen from https://github.com/tgirlcloud/nix-templates/blob/main/node/default.nix
{ lib, buildNpmPackage }:

buildNpmPackage {
  pname = "RENAME ME";
  version = "0.0.1";

  src = ./.;

  npmDepsHash = lib.fakeHash;

  meta = {
    description = "PROVIDE ME";
    homepage = "PROVIDE ME";
    license = lib.licenses.mit;
    maintainers = with lib.maintainers; [ ];
    mainProgram = "example";
  };
}
