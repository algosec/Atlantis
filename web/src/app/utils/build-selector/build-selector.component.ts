import {Component, EventEmitter, Input, OnChanges, OnInit, Output} from '@angular/core';
import {IBuildsByBranch, IBuildsByBranchByTeam, ITeam} from "../../../../../shared/src/model";

export interface UpdateBuildEvent {
  version: string;
  branch: string;
  build: string;
}

@Component({
  selector: 'build-selector',
  templateUrl: './build-selector.component.html',
  styleUrls: ['./build-selector.component.css']
})
export class BuildSelectorComponent implements OnInit, OnChanges {

  @Input() build: string;
  @Input() buildsByBranchByTeams: IBuildsByBranchByTeam[];
  @Input() teams: ITeam[];
  @Output() buildChange: EventEmitter<UpdateBuildEvent> = new EventEmitter<UpdateBuildEvent>();

  branchesList: IBuildsByBranch[];
  buildsList: string[];

  selectedTeam: string;
  selectedBranch: string;

  ngOnInit(): void {
    this.initSelection();
  }

  ngOnChanges(): void {
    if (!this.buildsByBranchByTeams) {
      return;
    }
    this.initSelection();
  }

  update(): void {
    this.buildChange.emit({
      version: this.buildsByBranchByTeams.find(x => x.id === this.selectedTeam).version,
      branch: this.buildsByBranchByTeams.find(x => x.id === this.selectedTeam).branches.find(x => x.id === Number(this.selectedBranch)).title,
      build: this.build
    });
  }

  initSelection(): void {
    if (!this.build) {
      this.updateFirstTeam();
      return;
    }

    for (let i = 0; i < this.buildsByBranchByTeams.length; i++) {
      for (let j = 0; j < this.buildsByBranchByTeams[i].branches.length; j++) {
        if (this.buildsByBranchByTeams[i].branches[j].builds.includes(this.build)) {
          this.selectedTeam = this.buildsByBranchByTeams[i].id;
          this.selectedBranch = String(this.buildsByBranchByTeams[i].branches[j].id);
          this.computeBranchesList();
          this.computeBuildsList();
          return;
        }
      }
    }

    // if the defined build could not be found - just select the first team
    this.updateFirstTeam()
  }

  updateFirstTeam(): void {
    if (this.buildsByBranchByTeams.length == 0) {
      return;
    }
    this.selectedTeam = this.buildsByBranchByTeams[0].id; // by default select the first version (team)
    this.updateTeamAndBranch();
  }

  updateTeamAndBranch(): void {
    const team: ITeam = this.findTeam(this.selectedTeam);

    const branches = this.buildsByBranchByTeams.find(x => x.id === this.selectedTeam).branches;
    let targetBranch = branches.find(x => x.title === team.defaultBranch);
    targetBranch = targetBranch || (branches.length > 0 && branches[0]);

    this.selectedBranch = String(targetBranch.id || 'unknown');
    this.computeBranchesList();
    this.computeBuildsList();
    this.selectFirstBuild();
  }

  private findTeam(version: string) {
    const filteredArray = this.teams.filter(v => v.id === version);
    return (filteredArray.length === 0) ? null : filteredArray[0];
  }

  updateBranch(): void {
    this.computeBuildsList();
    this.selectFirstBuild();
  }

  computeBranchesList(): void {
    this.branchesList = this.buildsByBranchByTeams.find(x => x.id === this.selectedTeam)?.branches;
    this.branchesList.sort((a, b) => (a.title < b.title ? -1 : 1))
  }

  computeBuildsList(): void {
    this.buildsList = this.branchesList?.find(x => x.id === Number(this.selectedBranch)).builds;
  }

  selectFirstBuild(): void {
    this.build = this.buildsList[0] || '';
    this.update();
  }
}
