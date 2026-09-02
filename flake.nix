{
  description = "Vite+ project environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "aarch64-darwin"
        "aarch64-linux"
        "x86_64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
          projectPackage = builtins.fromJSON (builtins.readFile ./package.json);
          vitePlus = pkgs.writeShellApplication {
            name = "vp";
            runtimeInputs = [ pkgs.bun ];
            text = ''
              if [ -x "$PWD/node_modules/.bin/vp" ]; then
                exec "$PWD/node_modules/.bin/vp" "$@"
              fi

              exec bunx --bun --package=vite-plus@${projectPackage.devDependencies."vite-plus"} vp "$@"
            '';
          };
        in
        {
          default = pkgs.mkShellNoCC {
            packages = with pkgs; [
              bun
              nodejs_22
              sqld
              typescript-language-server
              vitePlus
            ];
          };
        }
      );

      formatter = forAllSystems (system: (import nixpkgs { inherit system; }).nixfmt-tree);
    };
}
