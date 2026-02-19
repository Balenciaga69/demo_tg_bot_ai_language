cd "."
$configs = @(
   @{ Output = "out/nest-src.txt"; Path = "./src/" }
)
$baseArgs = @(
   "--no-file-summary",
   "--remove-comments",
   "--remove-empty-lines",
   "--include", "**/*.ts,**/*.tsx",
   "--ignore", "data/**,**/__tests__/**,**/*.spec.ts",
   "--style", "plain"
)
foreach ($config in $configs) {
   $args = $baseArgs + @("--output", $config.Output, $config.Path)
   repomix @args
   # repomix --remove-comments --remove-empty-lines --include "**/*.ts,**/*.tsx" --ignore "data/**,**/__tests__/**,**/*.spec.ts" --style plain --output $($config.Output) $($config.Path)
}