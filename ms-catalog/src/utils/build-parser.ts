export function isValidBuild(build:string): boolean {
    return !!build.match(/^\d+\.\d+\.\d+\.\d+$/);
}

export function getVersionFromBuild(build:string): string {
    const match = build.match(/^(\d+\.\d+)\./);
    return match && match[1]; // return the first group;
}

export function getBranchPrefixFromBuild(build: string): string {
    const match = build.match(/^(\d+\.\d+\.\d+)/);
    return match && match[1]; // return the first group;
}

export function versionToDisplayName(version: string): string {
    // transform 3000.10 -> A30.10, 3200.0.5.88 -> A32.0 //todo
    return version.replace(/^(\d{2})\d{2}\.(\d+)(\..*)?$/,'A$1.$2');
}

export function getThirdPart(branch: string): string {
    const match = branch.match(/^[^/]+\/[^/]+\/([^/]+)\//);
    return match && match[1]; // return the first group which is the third part;
}

export function updateRunMode(mode: string): string {
    return mode.replace("main", "master");
}
