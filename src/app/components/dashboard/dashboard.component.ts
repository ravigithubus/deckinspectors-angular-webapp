import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpsRequestService } from "../../service/https-request.service";
import { Project } from "../../common/models/project";
import { OrchestratorCommunicationService } from "../../orchestrator-service/orchestrartor-communication/orchestrator-communication.service";
import { OrchestratorEventName } from "../../orchestrator-service/models/orchestrator-event-name";
import { ObjectCloneServiceService } from "../../service/object-clone-service.service";
import { ProjectState } from "../../app-state-service/store/project-state-model";
import { Store } from "@ngrx/store";
import { ProjectQuery } from "../../app-state-service/project-state/project-selector";
import {LoginService} from "../login/login.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit
{
  showProjectInfo: string = 'home';
  projectInfo! : Project;
  projectInfos!: Project[];
  allProjects!: Project[];
  projectState!: ProjectState;
  isChildClickEventTriggered: boolean = false;
  disableInvasiveBtn: boolean = false;
    constructor(private cdr: ChangeDetectorRef,
                private httpsRequestService:HttpsRequestService,
                private orchestratorCommunicationService:OrchestratorCommunicationService,
                private store: Store<any>,
                private loginService: LoginService,
                private router: Router) {}

    ngOnInit(): void {
      // this.fetchProjectData();
      this.performUserLoginSteps();
      this.subscribeToshowProjectInfoToggle();
      this.subscribeToProjectState();
    }


  private fetchProjectData() {
    this.httpsRequestService.getHttpData<any>('https://deckinspectors-dev.azurewebsites.net/api/project/getProjectsByUser/deck').subscribe(
      (data) => {
        this.projectInfos = this.filterProject(data.projects);
        this.allProjects = this.filterProject(data.projects);
      },
      error => {
        console.log(error);
      }
    )
  }

  private fetchProjectDataToGetLastElement() {
    this.httpsRequestService.getHttpData<any>('https://deckinspectors-dev.azurewebsites.net/api/project/getProjectsByUser/deck').subscribe(
      (data) => {
        this.projectInfos = this.filterProject(data.projects);
        this.allProjects = this.filterProject(data.projects);
        this.projectInfo = this.getLastProject(data.projects);
        this.gotoProject(this.projectInfo);
      },
      error => {
        console.log(error);
      }
    )
  }

  public gotoProject(projectInfo :Project): void {
      if (this.isChildClickEventTriggered) {
        this.isChildClickEventTriggered = false;
          return;
      }
    this.projectInfo = projectInfo;
    //TODO: Remove this temp solution
    projectInfo.type = 'project';
    this.orchestratorCommunicationService.publishEvent(OrchestratorEventName.Add_ELEMENT_TO_PREVIOUS_BUTTON_LOGIC,
      ObjectCloneServiceService.deepClone(projectInfo));
    this.orchestratorCommunicationService.publishEvent(OrchestratorEventName.SHOW_SCREEN,'project')
    this.disableInvasiveBtn = !this.projectInfo.isInvasive;
  }

  private subscribeToshowProjectInfoToggle() {
    this.orchestratorCommunicationService.getSubscription(OrchestratorEventName.SHOW_SCREEN).subscribe(data => {
      this.showProjectInfo = data;
      if (data === 'home') {
        this.disableInvasiveBtn = false;
      }
    })
  }

  projectSearch($event: string) {
    this.projectInfos = this.allProjects.filter((project) =>
      project.name.toLowerCase().includes($event.toLowerCase())
    );
  }

  newProjectUploaded() {
      // add Timeout
      setTimeout(() => {
        this.fetchProjectDataToGetLastElement();
      },1000)
  }

  changeProjectState() {
    this.projectState = this.projectState === ProjectState.VISUAL ? ProjectState.INVASIVE : ProjectState.VISUAL;
    this.orchestratorCommunicationService.publishEvent(OrchestratorEventName.PROJECT_STATE_UPDATE, {state:this.projectState});
  }

  private subscribeToProjectState() {
    this.store.select(ProjectQuery.getProjectModel).subscribe(data => {
      this.projectState = data.state;
      this.fetchProjectData();
    });
  }

  private filterProject(projects:Project[]): Project[] {
    if (this.projectState === ProjectState.INVASIVE) {
      return projects.filter(project => project.isInvasive);
    }
    return projects;
  }

  private getLastProject(projects: Project[]) {
      return projects[projects.length-1];
  }

  childClickEventTriggered($event: boolean) {
    this.isChildClickEventTriggered = $event;
  }

  protected readonly event = event;

  private performUserLoginSteps() {
    if (this.loginService.isLoggedIn()) {
        this.fetchProjectData();
    } else {
      this.router.navigate(['/login'])
    }
  }
}
