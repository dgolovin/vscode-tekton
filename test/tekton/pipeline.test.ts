/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the pipeline root for license information.
 *-----------------------------------------------------------------------------------------------*/

'use strict';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';
import { TknImpl, Command, ContextType } from '../../src/tkn';
import { Pipeline, StartPipelineObject, PipeResources, PipeParams, PipelineTrigger, NameType } from '../../src/tekton/pipeline';
import { PipelineExplorer } from '../../src/pipeline/pipelineExplorer';
import { TektonItem } from '../../src/tekton/tektonitem';
import { TestItem } from './testTektonitem';
import * as vscode from 'vscode';

const expect = chai.expect;
chai.use(sinonChai);

suite('Tekton/Pipeline', () => {
    let quickPickStub: sinon.SinonStub;
    let sandbox: sinon.SinonSandbox;
    let execStub: sinon.SinonStub;
    let getPipelineStub: sinon.SinonStub;
    let termStub: sinon.SinonStub;
    let pipeTrigger: PipelineTrigger[];
    let startPipelineObj: StartPipelineObject;
    const pipelineNode = new TestItem(TknImpl.ROOT, 'test-pipeline', ContextType.PIPELINENODE, null);
    const pipelineItem = new TestItem(pipelineNode, 'pipeline', ContextType.PIPELINE, null);


    setup(() => {
        sandbox = sinon.createSandbox();
        execStub = sandbox.stub(TknImpl.prototype, 'execute').resolves({ error: null, stdout: '', stderr: '' });
        sandbox.stub(TknImpl.prototype, 'getPipelines').resolves([pipelineItem]);
        getPipelineStub = sandbox.stub(TektonItem, 'getPipelineNames').resolves([pipelineItem]);
        sandbox.stub(vscode.window, 'showInputBox');
        termStub = sandbox.stub(TknImpl.prototype, 'executeInTerminal').resolves();
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('called from \'Tekton Pipelines Explorer\'', () => {

        test('executes the list tkn command in terminal', async () => {
            await Pipeline.list(pipelineItem);
            expect(termStub).calledOnceWith(Command.listPipelinesInTerminal(pipelineItem.getName()));
        });

    });

    suite('called from command palette', () => {

        test('calls the appropriate error message when no pipeline found', async () => {
            getPipelineStub.restore();
            sandbox.stub(TknImpl.prototype, 'getPipelineResources').resolves([]);
            try {
                await Pipeline.list(null);
            } catch (err) {
                expect(err.message).equals('You need at least one Pipeline available. Please create new Tekton Pipeline and try again.');
                return;
            }
        });
    });
     suite('start', () => {

        test('start returns null when no pipeline', async () => {
            const result = await Pipeline.start(null);
            expect(result).null;
        });

    });
    suite('restart', () => {

        test('restart returns expected error string with pipeline restart', async () => {
            getPipelineStub.restore();
            sandbox.stub(TknImpl.prototype, 'getPipelineResources').resolves([]);
            try {
                await Pipeline.restart(null);
            } catch (err) {
                expect(err.message).equals("Failed to create Pipeline with error '${err}'");
                return;
            }
        });
        test('restart returns expected string with pipeline restart', async () => {
            getPipelineStub.restore();
            sandbox.stub(TknImpl.prototype, 'restartPipeline').resolves();
            const result = await Pipeline.restart(pipelineItem);
            expect(result).equals("Pipeline 'pipeline' successfully created");
            
        });

        test('start returns null when no pipeline', async () => {
            const result = await Pipeline.restart(null);
            expect(result).null;
        });
    });

    suite('describe', () => {

        test('describe calls the correct tkn command in terminal', async () => {
            await Pipeline.describe(pipelineItem);
            expect(termStub).calledOnceWith(Command.describePipelines(pipelineItem.getName()));
        });

    });
    suite('delete', () => {

        test('describe calls the correct tkn command in terminal', async () => {
            await Pipeline.delete(pipelineItem);
            expect(termStub).calledOnceWith(Command.deletePipeline(pipelineItem.getName()));
        });

    });

    suite('restart', () => {
        test('restarts a pipeline with appropriate resources', async () => {
            sandbox.stub(Pipeline, "restart").withArgs(pipelineItem).resolves(`Pipeline 'pipeline' successfully created`);
            const result = await Pipeline.restart(pipelineItem);
            expect(result).equals(`Pipeline 'pipeline' successfully created`);
        });
        
        test('returns null if no pipeline selected', async () => {
            const result = await Pipeline.restart(undefined);
            expect(result).equals(null);
        });
    });


    suite('start', () => {

        setup(() => {

            let testNames: NameType[] = [{
                name: "test",
                type: "test-type"
            }];

            let testResources: PipeResources[] = [
                {
                    name: "test-resource1",
                    resourceRef: "resource1"
                },
                {
                    name: "test-resource2",
                    resourceRef: "resource1"
                }
            ];
            let testParams: PipeParams[] = [
                {
                    default: "package",
                    description: "Param test description",
                    name: "test-param1"
                },
                {
                    default: "package",
                    description: "Param test description",
                    name: "test-param2"
                }
            ];

            pipeTrigger = [{
                name: "pipeline",
                resources: testNames,
                params: testParams,
                serviceAcct: undefined
            }];

            startPipelineObj = {
                name: "pipeline",
                resources: testResources,
                params: testParams,
                serviceAccount: undefined
            };
        });

        test('starts a pipeline with appropriate resources', async () => {
            sandbox.stub(Pipeline, "startPipelineObject").withArgs(pipeTrigger).resolves(startPipelineObj);
            sandbox.stub(Pipeline, "start").withArgs(pipelineItem).resolves(`Pipeline 'pipeline' successfully created`);
            const result = await Pipeline.start(pipelineItem);
            expect(result).equals(`Pipeline '${startPipelineObj.name}' successfully created`);
            expect('tkn pipeline start pipeline --resource test-resource1=resource1 --resource test-resource2=resource1 --param test-param1=package --param test-param2=package -s pipeline').equals(Command.startPipeline(startPipelineObj));
        });

        test('returns null if no pipeline selected', async () => {
            const result = await Pipeline.start(undefined);
            expect(result).equals(null);
        });

    });


    suite('about', () => {
        test('calls the proper tkn command in terminal', () => {
            Pipeline.about();

            expect(termStub).calledOnceWith(Command.printTknVersion());
        });
    });

    suite('refresh', () => {
        test('calls refresh on the explorer', () => {
            const stub = sandbox.stub(PipelineExplorer.prototype, 'refresh');
            Pipeline.refresh();
            expect(stub).calledOnce;
        });
    });

});
