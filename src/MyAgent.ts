import {
  AgentAuthorizationClient,
  AzureFileHandler,
} from "@bentley/backend-itwin-client";
import {
  ChangeSetPostPushEvent,
  EventSubscription,
  IModelHubClient,
  IModelHubEventType,
  HubIModel,
  IModelQuery,
  IModelBankClient,
} from "@bentley/imodelhub-client";
import {
  ApplicationType,
  AuthorizedBackendRequestContext,
  BriefcaseDb,
  BriefcaseManager,
  IModelHost,
  IModelHostConfiguration,
} from "@bentley/imodeljs-backend";
import { IModelVersion, SyncMode } from "@bentley/imodeljs-common";
import { AgentConfig } from "./AgentConfig";
import { ContextRegistryClient } from "@bentley/context-registry-client";
import { Guid } from "@bentley/bentleyjs-core";
import {
  AuthorizedClientRequestContext,
  AccessToken,
  UserInfo,
} from "@bentley/itwin-client";
import {
  BasicAccessToken,
  IModelBankBasicAuthorizationClient,
} from "@bentley/imodelhub-client/lib/imodelbank/IModelBankBasicAuthorizationClient";
const email = "test";
const password = "test";
export function createRequestContext() {
  return new AuthorizedClientRequestContext(
    BasicAccessToken.fromCredentials({
      email,
      password,
    })
  );
}
export class MyAgent {
  private readonly config: AgentConfig;
  private readonly hubClient: IModelBankClient;
  private readonly oidcClient: AgentAuthorizationClient;

  private hubSubscription?: EventSubscription;
  private deleteEventListener?: () => void;

  constructor(config: AgentConfig) {
    this.config = config;
    const url = "http://localhost:4000";
    const imodelClient = new IModelBankClient(url, undefined);
    this.hubClient = imodelClient;
    this.oidcClient = new AgentAuthorizationClient({
      clientId: config.CLIENT_ID,
      clientSecret: config.CLIENT_SECRET,
      scope: "imodelhub context-registry-service:read-only urlps-third-party",
    });
  }
  // •	imodelhub
  // •	urlps-third-party
  // •	context-registry-service:read-only

  public async initialize() {
    const hostConfig = new IModelHostConfiguration();
    hostConfig.applicationType = ApplicationType.WebAgent;
    hostConfig.imodelClient = this.hubClient;
    await IModelHost.startup(hostConfig);
  }

  public async listen() {
    const ctx = await this.createContext();

    // Create iModelHub event subscription
    const eventTypes = [IModelHubEventType.ChangeSetPostPushEvent];
    this.hubSubscription = await this.hubClient.events.subscriptions.create(
      ctx,
      this.config.IMODEL_ID,
      eventTypes
    );
    console.log(
      `Event subscription "${this.hubSubscription.wsgId}" created in iModelHub.`
    );

    // Define event listener
    const listener = async (event: ChangeSetPostPushEvent) => {
      try {
        console.log(
          `Received notification that changeset "${event.changeSetId} was just posted to the Hub`
        );
        await this.run(IModelVersion.asOfChangeSet(event.changeSetId));
      } catch (error) {
        console.error(error);
        console.error("Failed to handle changeset event", event);
      }
    };

    // Start listening to events
    const authCallback = () => this.oidcClient.getAccessToken();
    this.deleteEventListener = this.hubClient.events.createListener(
      ctx,
      authCallback,
      this.hubSubscription.wsgId,
      this.config.IMODEL_ID,
      listener
    );
  }

  public async run(version = IModelVersion.latest()) {
    console.log(version);
    const contextId = "9374a302-8743-403e-ad03-6c49ef13c15e";
    const imjs_test_context_id = "acd4f071-02d8-4c62-8af3-6b2c77b19a5c";
    const imjs_test_imodel_id = "8f9f2aa4-0711-4a07-9574-7f6bb2b3b755";
    const req = await createRequestContext();
    const hg = await BriefcaseManager.imodelClient.iModels.get(req, contextId);
    console.log(hg);
    // const briefcaseProps = await BriefcaseManager.download(
    //   ctx,
    //   this.config.CONTEXT_ID,
    //   this.config.IMODEL_ID,
    //   downloadOptions,
    //   version
    // );
    // const ctx = await this.createContext();
    // console.log(version);
    // console.log("开始了");
    // const path = "D:/MS/nba.bim";
    // const iModelName = "reinstateChangeTest";
    // const projectName = "StudyImodel111";
    // const projectId = "23383876-c4a1-4c6b-9dc4-f3f2cf828606";
    // const client = new ContextRegistryClient();
    // const uf = ctx.accessToken.getUserInfo();
    // console.log(uf);
    // const downloadOptions = { syncMode: SyncMode.PullOnly };
    // ctx.enter();
    // const briefcaseProps = await BriefcaseManager.download(
    //   ctx,
    //   this.config.CONTEXT_ID,
    //   this.config.IMODEL_ID,
    //   downloadOptions,
    //   version
    // );
    // console.log(briefcaseProps);
    // const p = await client.getProject(ctx, {
    //   $select: "*",
    //   $filter: `Name+eq+'${projectName}'`,
    // });
    // console.log(p.name);
    // const tk = new AccessToken();
    // const u = new UserInfo("devin.liu@bentley.com");
    // tk.setUserInfo(u);
    // const token = new AuthorizedClientRequestContext(tk);
    // const p = "D:/ORD";
    // BriefcaseManager.initialize(p);
    // const hu = await BriefcaseManager.create(
    //   ctx,
    //   Guid.createValue(),
    //   "NBA2020.bim",
    //   { rootSubject: { name: "TestSubject" } }
    // );
    // console.log(hu);
    // console.log(rw.name);
    // const projectId = Guid.createValue();
    // const rwIModelId = await BriefcaseManager.create(
    //   ctx,
    //   projectId,
    //   iModelName,
    //   { rootSubject: { name: "TestSubject" } }
    // );
    // console.log(rwIModelId);
    // console.log(project);
    // const hu = await BriefcaseManager.imodelClient.iModel.get(
    //   ctx,
    //   this.config.IMODEL_ID
    // );
    // console.log(hu.name);
    // Download iModel
    // ctx.enter();
    // // Open iModel
    // const iModel = await BriefcaseDb.open(ctx, briefcaseProps.key);
    // ctx.enter();
    // // TODO....
    // console.log(iModel.rootSubject.name);
    // // Close iModel
    // iModel.close();
  }

  private async createContext() {
    const token = await this.oidcClient.getAccessToken();
    const ctx = new AuthorizedBackendRequestContext(token);
    ctx.enter();
    return ctx;
  }

  public async terminate() {
    if (this.deleteEventListener) {
      this.deleteEventListener();
      this.deleteEventListener = undefined;
    }

    if (this.hubSubscription) {
      await this.hubClient.events.subscriptions.delete(
        await this.createContext(),
        this.config.IMODEL_ID,
        this.hubSubscription.wsgId
      );
      console.log(
        `Event subscription "${this.hubSubscription.wsgId}" deleted in iModelHub.`
      );
      this.hubSubscription = undefined;
    }

    await IModelHost.shutdown();
  }
}
